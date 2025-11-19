// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useCallback, useRef, useReducer, use } from 'react';
import { 
  getFileSystem,
  setFileSystem,
} from '@/services/file-service';
import { Dir, File, FileAction } from '../types';
import { readFileInDir, createFileInDir, deleteFileFromDir, updateFileInDir, alphabetizeDir } from '@/lib/file';
import path from 'path';
import { flattenDir } from '@/lib/file';
 

type ActiveFile = File | null;
type EditedFiles = { [path: string]: FileAction };

function editedFilesReducer(state: { [key: string]: FileAction } = {}, action?: { type: FileAction | 'clear', path: string }) {
  if (!action) {
    return state;
  }
  // if (!action.path && action.type !== 'clear') {
  //   throw new Error("path must be provided for update action");
  // }

  const nextState = {...state};
  switch(action.type) {
    case 'created':
      nextState[action.path] = 'created';
      return nextState
    case 'deleted':
      if ( state[action.path] === 'created' ) {
        delete nextState[action.path];
        return nextState;
      }
      nextState[action.path] = 'deleted';
      return nextState;
    case 'updated':
      if ( nextState[action.path] === 'created' ) {
        return nextState;
      }
      nextState[action.path] = 'updated';
      return nextState;
    case 'clear': 
      return {};
  }
}

type ManagedFileSystem = {
  dir: Dir;
  editedFiles: EditedFiles;
  setDir: React.Dispatch<React.SetStateAction<Dir>>;
  getFile: (path: string) => DirEditRsp;
  updateFile: (path: string, content: string) => DirEditRsp;
  deleteFile: (path: string) => DirEditRsp;
  addFile: (path: string, content: string) => DirEditRsp;
  pullFileSystem: () => Promise<DirEditRsp>;
  clearEditedFiles: () => void;
}

export type DirEditRsp = {
  nextDirState: Dir;
  nextEditedFilesState: { [key: string]: FileAction };
  success: boolean
  file?: File;
}

// Hook to manage a directory and maintain sync with server.
function useManageFiles(folder: string | null): ManagedFileSystem {
  const [dir, setDir] = useState<Dir>({ title: path.basename(folder || ""), children: [] });
  const dirIsInitialized = useRef(false);
  const [pushLockout, setPushLockout] = useState<number>(0);
  // const [editedFiles, editedFilesDispatch] = useReducer(editedFilesReducer, {})
  const editedFilesRef = useRef<EditedFiles>({});

  // On load pull current file system from cloud.
  useEffect(() => {
    const initialPull = async() => {
      const rsp = await pullFileSystem();
      const files = flattenDir(rsp.nextDirState);
      files.forEach(file => {
        if ( !(file.path in editedFilesRef.current)) {
          editedFilesRef.current = editedFilesReducer(editedFilesRef.current, {type: 'updated', path: file.path});
        }
      })
    }

    initialPull();
  }, [])

  // If local files change push local dir state to cloud.
  useEffect(() => {
    if ( !dirIsInitialized.current ) { dirIsInitialized.current = true; return; };
    if ( pushLockout > 0 ) {
      setPushLockout(pushLockout - 1);
    } else {
      pushFileSystem();
    }
  }, [dir]);

  const pushFileSystem = useCallback(async () => {
      if ( folder ) {
        await setFileSystem(dir, folder);
      }
  }, [dir, folder]);

  async function pullFileSystem(): Promise<DirEditRsp> {
    setPushLockout(pushLockout + 1);
    if ( folder ) {
      const nextDirState: Dir = await getFileSystem(folder);
      
      setDir(nextDirState);
      const nextEditedFilesState = {};
      // editedFilesDispatch('clear');
      editedFilesRef.current = nextEditedFilesState;
      return {nextDirState, nextEditedFilesState, success: true};
    }
    return {nextDirState: dir, nextEditedFilesState: editedFilesRef.current, success: false};
  }
  
  // Get a file at the path from the local store.
  function getFile(path: string): DirEditRsp {
    const file = readFileInDir(path, dir);
    return {nextDirState: dir, nextEditedFilesState: editedFilesRef.current, success: file ? true : false, file: file ? file : undefined}
  }

  // Update a file at the path for the local store.
  function updateFile(filePath: string, content: string): DirEditRsp {
    const nextDirState = {...dir};
    let file = readFileInDir(filePath, nextDirState);
    if ( !file ) throw new Error(`File ${filePath} not found for update`);
    file.content = content;
    updateFileInDir(file, nextDirState);
    setDir(nextDirState);

    const nextEditedFilesState = editedFilesReducer(editedFilesRef.current, {type: 'updated', path: file.path});
    // editedFilesDispatch({type: 'updated', path: file.path});
    editedFilesRef.current = nextEditedFilesState;
    return {nextDirState, nextEditedFilesState, success: true};
  }

  // Add a file at the path for the local store.
  function addFile(filePath: string, content: string): DirEditRsp {
    const nextDirState = {...dir}
    let existingFile = readFileInDir(filePath, nextDirState);

    if ( existingFile ) {
      existingFile.content = content;
    } else {
      createFileInDir({path: filePath, content} ,nextDirState)
    }

    setDir(nextDirState);

    const nextEditedFilesState = editedFilesReducer(editedFilesRef.current, {type: 'created', path: filePath});
    // editedFilesDispatch({type: 'created', path: filePath});
    editedFilesRef.current = nextEditedFilesState;
    return {nextDirState, nextEditedFilesState,  success: true}
  }

  // Delete a file at the path for the local store.
  function deleteFile(filePath: string): DirEditRsp {
    const nextDirState = {...dir}
    const success = deleteFileFromDir(filePath, nextDirState);
    setDir(nextDirState);

    const nextEditedFilesState = editedFilesReducer(editedFilesRef.current, {type: 'deleted', path: filePath});
    // editedFilesDispatch({type: 'deleted', path: filePath});
    editedFilesRef.current = nextEditedFilesState;
    return {nextDirState, nextEditedFilesState,  success}
  }

  function clearEditedFiles() {
    // Reset the edited files map and force a re-render so consumers see the change
    editedFilesRef.current = {};
  }

  return {
    dir,
    editedFiles: editedFilesRef.current,
    setDir,
    getFile,
    updateFile,
    deleteFile,
    addFile,
    pullFileSystem,
    clearEditedFiles,
  }
}

// Hook to manage the currently active file being edited in any .
function useManageActiveFile(dir: Dir, editedFiles: EditedFiles, updateFile: ((filePath: string, content: string) => DirEditRsp)) {
  const [activeFile, setActiveFile] = useState<ActiveFile>(null);
  // const [actionState, actionDispatch] = useReducer(activeFileReducer, "none");
  const activeFileState = useRef<'none' | 'set' | 'updated'>("none");
  const debounce = useRef<number>(Date.now());
  // Always read the latest dir inside callbacks to avoid stale-closure reads
  const latestDirRef = useRef<Dir>(dir);
  useEffect(() => { latestDirRef.current = dir; }, [dir]);

  // Keep active file in sync with directory when dir is updated externally.
  useEffect(() => {
    // If no active file, nothing to sync; ensure editor update state is reset
    if (!activeFile) {
      updateActiveFileState('reset');
      return;
    }

    const freshActiveFile = readFileInDir(activeFile.path, dir);
    if (!freshActiveFile) {
      // File no longer exists in the updated dir
      setActiveFile(null);
      updateActiveFileState('reset');
      return;
    }

    // If content changed in the dir (e.g., after a pull), update the active file to reflect it
    if (freshActiveFile.content !== activeFile.content) {
      setActiveFile(freshActiveFile);
    }
  }, [dir])

  const updateActiveFileState = useCallback((action: 'reset' | 'next') => {
    if (Date.now() - debounce.current < 100) {
      return;
    };
    debounce.current = Date.now();
    if (action === 'reset') {
      activeFileState.current = 'none';
    } else if (action === 'next') {
      if (activeFileState.current === 'none') {
        activeFileState.current = 'set';
      } else if (activeFileState.current === 'set') {
        activeFileState.current = 'updated';
      }
    }
  }, []);

  function update(content: string | (() => string)): DirEditRsp {
    let dirEditRsp = {nextDirState: dir, nextEditedFilesState: editedFiles, success: true};
    let nextActiveFileState = activeFile;
    if ( activeFileState.current === 'updated' && activeFile ) {
      const nextContent = typeof content === 'string' ? content : content();
      nextActiveFileState = {path: activeFile.path, content: nextContent};
      setActiveFile(nextActiveFileState);
      dirEditRsp = updateFile(nextActiveFileState.path, nextActiveFileState.content);
    }
    updateActiveFileState('reset');
    return dirEditRsp;
  }

  function switch_(path: string) {
    // Use the most recent dir value to avoid reading stale content when invoked
    const file = readFileInDir(path, latestDirRef.current)
    setActiveFile(file);
  }

  return {
    activeFile, 
    update, 
    switch_,
    updateActiveFileState,
  }
}

// Put all directories into a virtual directory.
function useVirtualDirectory(projectName: string, dirs: ManagedFileSystem[]) {
  const managedFileSystems = dirs;

  const virtualDir = {title: projectName, children: dirs.map(mfs => mfs.dir)};

  // Snapshot current edited files at call time; avoids relying on rerenders
  function getEditedFiles(): EditedFiles {
    const merged = managedFileSystems
      .map(mfs => mfs.editedFiles)
      .map(efs => ({ ...efs }))
      .reduce((acc: EditedFiles, curr: EditedFiles) => {
        Object.entries(curr).forEach(([p, action]) => {
          acc[`${projectName}/${p}`] = action;
        });
        return acc;
      }, {} as EditedFiles);
    return merged;
  }

  function _consolidateDirRsp(rsp: DirEditRsp): DirEditRsp {
    const nextVirtualDirState = { ...virtualDir };
    const dirIndex = managedFileSystems.findIndex(mfs => mfs.dir.title === rsp.nextDirState.title);
    if ( dirIndex === -1 ) {
      return {nextDirState: virtualDir, nextEditedFilesState: {}, success: false};
    }

    nextVirtualDirState.children[dirIndex] = rsp.nextDirState;
    // Always provide a consolidated, current snapshot of edited files
    const nextEditedFilesState = getEditedFiles();
    return {nextDirState: nextVirtualDirState, nextEditedFilesState, success: rsp.success};
  }

  function _useManageFilesWrapper(command: string, filePath: string, content?: string): DirEditRsp {
    const pathSplit = filePath.split('/');
    if ( pathSplit[0] === projectName ) pathSplit.shift(); // remove project title;
    const dirTitle = pathSplit[0];
    filePath = pathSplit.join('/');

    const mfsResults = managedFileSystems.find(mfs => mfs.dir.title === dirTitle);
    if ( mfsResults ) {
      switch(command) {
        case 'get': {
          const rsp = mfsResults.getFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'update': {
          if ( content === undefined ) return {nextDirState: virtualDir, nextEditedFilesState: {}, success: false};
          const rsp = mfsResults.updateFile(filePath, content);
          return _consolidateDirRsp(rsp);
        }
        case 'delete': {
          const rsp = mfsResults.deleteFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'add':
          if ( content === undefined ) return {nextDirState: virtualDir, nextEditedFilesState: {}, success: false};
          const rsp = mfsResults.addFile(filePath, content);
          return _consolidateDirRsp(rsp);
      }
    }

    return {nextDirState: virtualDir, nextEditedFilesState: getEditedFiles(), success: false};
  }

  function getFile(filePath: string) {
    return _useManageFilesWrapper('get', filePath);
  }

  function updateFile(filePath: string, content: string) {
    return _useManageFilesWrapper('update', filePath, content);
  }

  function deleteFile(filePath: string) {
    return _useManageFilesWrapper('delete', filePath);
  }

  function addFile(filePath: string, content: string) {
    return _useManageFilesWrapper('add', filePath, content);
  }

  // function pullFileSystem() {
  //   managedFileSystems.forEach(mfs => {
  //     mfs.pullFileSystem();
  //   });
  // }

  async function pullFileSystem(): Promise<DirEditRsp> {
    await Promise.all(managedFileSystems.map(mfs => mfs.pullFileSystem()));
    return _consolidateDirRsp({nextDirState: virtualDir, nextEditedFilesState: getEditedFiles(), success: true});
  }

  function clearEditedFiles() {
    // Delegate to each managed FS to properly clear and trigger rerenders
    managedFileSystems.forEach(mfs => {
      mfs.clearEditedFiles();
    });
  }

  return {
    virtualDir,
    getEditedFiles,
    updateFile,
    getFile,
    deleteFile,
    addFile,
    pullFileSystem,
    clearEditedFiles,
  };
}

export { useManageFiles, useManageActiveFile, useVirtualDirectory };
