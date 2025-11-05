// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { 
  getFileSystem,
  setFileSystem,
  exportHtmlToPdf,
  createNewProject,
} from '@/services/file-service';
import { Dir, File, FileAction } from '../types';
import { readFileInDir, createFileInDir, deleteFileFromDir, updateFileInDir } from '@/lib/file';
import path from 'path';
import { flattenDir } from '@/lib/file';

type ManagedFileSystem = {
  dir: Dir;
  setDir: React.Dispatch<React.SetStateAction<Dir>>;
  getFile: (path: string) => File | null;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  addFile: (path: string, content: string) => void;
  exportFile: (path: string, context?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  addProject: (projectName: string) => void;
  pullFileSystem: () => void;
}

function useManageFiles(folder: string): ManagedFileSystem {
  const [dir, setDir] = useState<Dir>({ title: folder, children: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const [pushLockout, setPushLockout] = useState<number>(0);

  // On load pull current file system from cloud.
  useEffect(() => {
    pullFileSystem();
  }, [])

  // If files change push local dir state to cloud.
  useEffect(() => {
    console.log("useEffect: ", isInitialized, pushLockout, dir);
    if ( !isInitialized.current ) { isInitialized.current = true; return; };
    if ( pushLockout > 0 ) {
      setPushLockout(pushLockout - 1);
    } else {
      pushFileSystem();
    }
  }, [dir]);

  const pushFileSystem = useCallback(async () => {
    console.log("pushFileSystem: ", dir);
    setIsLoading(true);
    try {
      await setFileSystem(dir, folder);
    } catch (error) {
      setError("Failed to sync directory");
    } finally {
      setIsLoading(false);
    }
  }, [dir]);

  async function pullFileSystem() {
    setPushLockout(pushLockout + 1);
    setIsLoading(true);
    try {
      const newContents: Dir = await getFileSystem(folder);
      setDir(newContents);
    } catch (error) {
      setError("Failed to fetch directory");
    } finally {
      setIsLoading(false);
    }
  }

  // Build a new cloud store.
  function addProject(projectName: string) {
    setIsLoading(true);
    const nextRootDir = {...dir};
    const newDir: Dir = { title: projectName, children: [] };
    try {
      createNewProject(projectName);
      nextRootDir.children.push(newDir);
      setDir(nextRootDir);
    } catch (error) {
      setError("Failed to create new project");
    } finally {
      setIsLoading(false);
    }
  }

  // Get a file at the path from the local store.
  function getFile(path: string): File | null {
    return readFileInDir(path, dir);
  }

  // Update a file at the path for the local store.
  async function updateFile(filePath: string, content: string) {
    const nextDir = {...dir};
    let file = readFileInDir(filePath, nextDir);
    if ( !file ) throw new Error(`File ${filePath} not found for update`);
    file.content = content;
    updateFileInDir(file, nextDir);
    setDir(nextDir);
  }

  // Add a file at the path for the local store.
  function addFile(fullPath: string, content: string) {
    const nextDir = {...dir}
    try {
      let existingFile = readFileInDir(fullPath, dir);
      if ( existingFile ) {
        existingFile.content = content;
        return;
      } else {
        createFileInDir({path: fullPath, content} ,nextDir)
      }
    } catch (error) {
      setError("Failed to add file");
    } finally {
      setDir(nextDir);
    }
  }

  // Delete a file at the path for the local store.
  function deleteFile(pathToDelete: string) {
    const nextDir = {...dir}
    deleteFileFromDir(pathToDelete, nextDir);
    setDir(nextDir);
  }

  // Export a file to a pdf with potential new content.
  async function exportFile(filePath: string, context?: string) {
    const formData = new FormData();
    const file = readFileInDir(filePath, dir);
    if ( !file ) {
      setError(`File ${filePath} not found for export`);
      return;
    }
    formData.append('doc', context || file.content);
    formData.append('docName', path.basename(file.path));

    await exportHtmlToPdf(formData);
  }

  return {
    dir,
    setDir,
    getFile,
    updateFile,
    deleteFile,
    addFile,
    isLoading,
    exportFile,
    error, 
    addProject,
    pullFileSystem,
  }
}


function manageEditedFilesReducer(state: { [key: string]: FileAction } = {}, action?: { type: FileAction | 'clear', path: string }) {
  if (!action) {
    return state;
  }
  if (!action.path && action.type !== 'clear') {
    throw new Error("path must be provided for update action");
  }

  switch(action.type) {
    case 'created':
      state[action.path] = 'created';
      return state;
    case 'deleted':
      if ( state[action.path] === 'created' ) {
        delete state[action.path];
        return state;
      }
      state[action.path] = 'deleted';
      return state;
    case 'updated':
      if ( state[action.path] === 'created' ) {
        return state;
      }
      state[action.path] = 'updated';
      return state;
    case 'clear': 
      return {};
  }
}

type ActiveFile = File | null;
type EditedFiles = { [path: string]: FileAction };

// Hook to manage current active file and edited files with optimistic updates.
export default function useManageFileState(folder: string) {
  const managedFileSystem = useManageFiles(folder);

  const [activeFile, _setActiveFile] = useState<ActiveFile>(null);
  const optimisticActiveFile = useRef<ActiveFile>(null);

  const [editedFiles, editedFilesDispatch] = useReducer(manageEditedFilesReducer, {});
  const optimisticEditedFiles = useRef<EditedFiles | null>({});

  const [initialized, setInitialized] = useState<boolean>(false);

  const setEditedFiles = useCallback((type: FileAction | 'clear', path: string) => {
    if ( type === 'clear' ) {
      optimisticEditedFiles.current = {};
      editedFilesDispatch({ type: 'clear', path: '' });
      return;
    }
    optimisticEditedFiles.current = manageEditedFilesReducer(optimisticEditedFiles.current || {}, { type, path });
    editedFilesDispatch({ type, path });
  }, [editedFilesDispatch]);

  // update active file if dir updated;
  useEffect(() => {
    if ( activeFile ) {
      const updatedFile = managedFileSystem.getFile(activeFile.path);
      if ( updatedFile && updatedFile.content !== activeFile.content ) {
        optimisticActiveFile.current = { ...updatedFile };
        _setActiveFile(optimisticActiveFile.current);
      }
    }
  }, [managedFileSystem.dir, activeFile?.path])

  // On initial load, set edited files to all files in dir.
  useEffect(() => {
    if( !initialized && managedFileSystem.dir.children.length > 0 ) {
      setInitialized(true);
      let copyEditedFiles = { ...editedFiles };
      let files = flattenDir(managedFileSystem.dir);
      files.forEach(file => {
        if( !(file.path in copyEditedFiles) ) {
          setEditedFiles('updated', file.path);
        }
      });
    }
  }, [managedFileSystem.dir])

  function setActiveFileContent(content: string) {
    console.log("setActiveFileContent: ", content);
    if ( !activeFile ) return;
    optimisticActiveFile.current = { path: activeFile.path, content };
    console.log(optimisticActiveFile.current);
    _setActiveFile(optimisticActiveFile.current);
    managedFileSystem.updateFile(optimisticActiveFile.current.path, content);
    setEditedFiles('updated', activeFile.path);
  }

  function switchActiveFileTo(path?: string) {
    const file = path ? managedFileSystem.getFile(path) : null;
    optimisticActiveFile.current = file && path ? { path, content: file.content } : null;
    _setActiveFile(optimisticActiveFile.current);
  }

  function deleteFile(path: string) {
    managedFileSystem.deleteFile(path);
    setEditedFiles('deleted', path);
  }

  function exportFile(path: string) {
    let content = '';
    if ( optimisticActiveFile.current && optimisticActiveFile.current.path === path ) {
      content = optimisticActiveFile.current.content;
    } else {
      const file = managedFileSystem.getFile(path);
      content = file ? file.content : '';
    }

    if( !content) {
      console.error("File not found for export: ", path);
      return;
    }

    managedFileSystem.exportFile(path, content);
  }

  function createFile(path: string, content: string) {
    managedFileSystem.addFile(path, content);
    setEditedFiles('created', path);

    optimisticActiveFile.current = { path, content };
    _setActiveFile(optimisticActiveFile.current);
  }

  const clearEditedFiles = useCallback(() => {
    setEditedFiles('clear', '');
  }, [setEditedFiles])

  return {
    allFiles: managedFileSystem.dir,
    loadFiles: managedFileSystem.pullFileSystem,
    activeFile,
    optimisticActiveFile: optimisticActiveFile.current,
    optimisticEditedFiles: optimisticEditedFiles.current,
    setActiveFileContent,
    switchActiveFileTo,
    editedFiles,
    clearEditedFiles,
    deleteFile,
    exportFile,
    createFile,
  }

}

export { useManageFiles };
