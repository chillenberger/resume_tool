// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { 
  getFileSystem,
  setFileSystem,
  exportHtmlToPdf,
  createNewProject,
} from '@/services/file-service';
import { Dir, Doc, File, FileAction } from '../types';
import { getDirFile, addFileToDir, deleteFileFromDir } from '@/lib/file';
import path from 'path';
import { flattenDir } from '@/lib/file';

type ManagedFileSystem = {
  dir: Dir;
  setDir: React.Dispatch<React.SetStateAction<Dir>>;
  getFile: (path: string) => Doc | null;
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

  useEffect(() => {
    pullFileSystem();
  }, [])

  // If files change sync server.
  useEffect(() => {
    if ( !isInitialized.current ) { isInitialized.current = true; return; };
    if ( pushLockout > 0 ) {
      setPushLockout(pushLockout - 1);
    } else {
      pushFileSystem();
    }
  }, [dir]);

  const pushFileSystem = useCallback(async () => {
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

  function getFile(path: string): Doc | null {
    try {
      let doc = getDirFile(path, dir);
      return doc;
    } catch (error) {
      setError("Failed to fetch file");
    }
    return null;
  }

  async function updateFile(filePath: string, content: string) {
    let file = getFile(filePath);
    if ( !file ) throw new Error(`File ${filePath} not found for update`);
    file.content = content;
    setDir({ ...dir });
  }

  function addFile(fullPath: string, content: string) {
    console.log("addFile, input: ", fullPath, content);
    const fileName = path.basename(fullPath);
    if ( !fileName ) throw new Error("Invalid file name");
    
    const newDoc: Doc = { title: fileName, content };
    try {
      let existingFile = getDirFile(fullPath, dir);
      if ( existingFile ) {
        existingFile.content = content;
        return;
      } else {
        console.log("adding new file to dir: ", fullPath, " project dir: ", dir);
        addFileToDir(path.dirname(fullPath), dir, newDoc);
      }
      setDir({ ...dir });
      return;
    } catch (error) {
      setError("Failed to add file");
    }
  }

  function addProject(projectName: string) {
    setIsLoading(true);
    const newDir: Dir = { title: projectName, children: [] };
    try {
      createNewProject(projectName);
    } catch (error) {
      setError("Failed to create new project");
    } finally {
      dir.children.push(newDir);
      setDir({ ...dir });
      setIsLoading(false);
    }
  }

  function deleteFile(pathToDelete: string) {
    const pathParts = pathToDelete.split('/').filter(part => part.length > 0);
    if ( pathParts.length === 0 ) {
      setError("Invalid path for deletion");
      return;
    }

    deleteFileFromDir(pathToDelete, dir);
    setDir({ ...dir });
  }

  async function exportFile(filePath: string, context?: string) {
    const formData = new FormData();
    const doc = getFile(filePath);
    if ( !doc ) {
      setError(`File ${filePath} not found for export`);
      return;
    }
    formData.append('doc', context || doc.content);
    formData.append('docName', doc.title);

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
    optimisticEditedFiles.current = manageEditedFilesReducer(optimisticEditedFiles.current || {}, { type, path:  folder + '/' + path });
    editedFilesDispatch({ type, path: folder + '/' + path });
  }, [editedFilesDispatch]);

  // update active file if dir updated;
  useEffect(() => {
    if ( activeFile ) {
      const updatedDoc = managedFileSystem.getFile(activeFile.path);
      if ( updatedDoc && updatedDoc.content !== activeFile.content ) {
        optimisticActiveFile.current = { path: updatedDoc.title, content: updatedDoc.content };
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
    if ( !activeFile ) return;
    optimisticActiveFile.current = { path: activeFile.path, content };
    _setActiveFile(optimisticActiveFile.current);
    managedFileSystem.updateFile(optimisticActiveFile.current.path, content);
    setEditedFiles('updated', activeFile.path);
  }

  function switchActiveFileTo(path?: string) {
    const doc = path ? managedFileSystem.getFile(path) : null;
    optimisticActiveFile.current = doc && path ? { path, content: doc.content } : null;
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
