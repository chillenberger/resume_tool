// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { 
  syncServerToDir,
  exportHtmlToPdf, 
  getDirContents,
  createNewProject,
} from '@/services/file-service';
import { Dir, Doc, File, FileAction } from '../types';
import { getDirFile, addFileToDir, deleteFileFromDir } from '@/lib/file';
import path from 'path';
import { flattenDir } from '@/lib/file';

type ManagedFileSystem = {
  dir: Dir;
  setDir: React.Dispatch<React.SetStateAction<Dir>>;
  getFile: (path: string) => Doc | undefined;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  addFile: (path: string, content: string) => void;
  exportFile: (path: string, context?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  addProject: (projectName: string) => void;
  loadDir: () => void;
}

function useManageFiles(folder: string): ManagedFileSystem {
  const [dir, setDir] = useState<Dir>({ title: folder, children: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    loadDir();
  }, [])

  // If files change sync server.
  useEffect(() => {
    if ( !isInitialized.current ) { isInitialized.current = true; return; };
    syncDirWithServer();
  }, [dir]);

  const syncDirWithServer = useCallback(async () => {
    console.log("Syncing directory to server...");
    setIsLoading(true);
    try {
      await syncServerToDir(dir, folder);
    } catch (error) {
      setError("Failed to sync directory");
    } finally {
      setIsLoading(false);
    }
  }, [dir]);

  async function loadDir() {
    setIsLoading(true);
    try {
      const dir: Dir = await getDirContents(folder);
      setDir(dir);
    } catch (error) {
      setError("Failed to fetch directory");
    } finally {
      setIsLoading(false);
    }
  }

  function getFile(path: string): Doc | undefined {
    try {
      let doc = getDirFile(path, dir);
      return doc ? doc : undefined;
    } catch (error) {
      setError("Failed to fetch file");
    }
  }

  async function updateFile(filePath: string, content: string) {
    let file = getFile(filePath);
    if ( !file ) throw new Error(`File ${filePath} not found for update`);
    file.content = content;
    setDir({ ...dir });
  }

  function addFile(fullPath: string, content: string) {
    const fileName = path.basename(fullPath);
    if ( !fileName ) throw new Error("Invalid file name");
    
    const newDoc: Doc = { title: fileName, content };
    try {
      let existingFile = getDirFile(fullPath, dir);
      if ( existingFile ) {
        existingFile.content = content;
        return;
      } else {
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

  async function exportFile(path: string, context?: string) {
    const formData = new FormData();
    const file = getFile(path);
    if ( !file ) {
      setError(`File ${path} not found for export`);
      return;
    }
    formData.append('doc', context || file.content);
    formData.append('docName', file.title);

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
    loadDir,
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

export default function useSyncedFileSystem(folder: string) {
  const managedFileSystem = useManageFiles(folder);
  const [activeFile, _setActiveFile] = useState<File | null>(null);
  const [activeFileUpdated, setActiveFileUpdated] = useState<boolean>(false);
  const [editedFiles, editedFilesDispatch] = useReducer(manageEditedFilesReducer, {});
  const [seededEditedFiles, setSeededEditedFiles] = useState<boolean>(false);

  // Add file to edited if updated. 
  useEffect(() => {
    if (activeFileUpdated && activeFile) {
      editedFilesDispatch({ type: 'updated', path: activeFile.path });
    }
  }, [activeFileUpdated])

  // On initial load, set edited files to all files in dir.
  useEffect(() => {
    if( !seededEditedFiles && managedFileSystem.dir.children.length > 0 ) {
      setSeededEditedFiles(true);
      let copyEditedFiles = { ...editedFiles };
      let files = flattenDir(managedFileSystem.dir);
      files.forEach(file => {
        if( !(file.path in copyEditedFiles) ) {
          editedFilesDispatch({ type: 'created', path: file.path });
        }
      });
    }
  }, [managedFileSystem.dir])

  function saveActiveFile() {
    if ( !activeFile || !activeFileUpdated ) return;
    managedFileSystem.updateFile(activeFile.path, activeFile.content);
    editedFilesDispatch({ type: 'updated', path: activeFile.path });
  }

  function setActiveFileContent(content: string) {
    if ( !activeFile ) return;
    _setActiveFile({ ...activeFile, content });
    setActiveFileUpdated(true);
  }

  function handleChangeActiveFile(path: string, currentContent?: string) {
    const file = managedFileSystem.getFile(path);
    if ( activeFile && currentContent ) {
      managedFileSystem.updateFile(activeFile.path, currentContent);
      editedFilesDispatch({ type: 'updated', path: activeFile.path });
    }

    if( !file ) return;
    _setActiveFile({ path, content: file.content });
    setActiveFileUpdated(false);
  }

  function handleDeleteFile(path: string) {
    if( activeFile?.path === path ) {
      _setActiveFile(null);
    }

    managedFileSystem.deleteFile(path);
    editedFilesDispatch({ type: 'deleted', path });
  }

  function handleExportFile(path: string) {
    if( path === activeFile?.path && activeFileUpdated ) {
      managedFileSystem.updateFile(activeFile.path, activeFile.content);
      setActiveFileUpdated(false);
    }

    const file = managedFileSystem.getFile(path);
    if( !file ) {
      console.error("File not found for export: ", path);
      return;
    }

    managedFileSystem.exportFile(path, file.content);
  }

  function handleCreateFile(path: string, content: string) {
    if( activeFile && activeFileUpdated ) {
      managedFileSystem.updateFile(activeFile.path, activeFile.content);
    }

    managedFileSystem.addFile(path, content);
    editedFilesDispatch({ type: 'created', path: path });
    _setActiveFile({ path, content });
  }

  function clearEditedFiles() {
    editedFilesDispatch({ type: 'clear', path: '' });
  }

  return {
    allFiles: managedFileSystem.dir,
    loadFiles: managedFileSystem.loadDir,
    activeFile,
    setActiveFileContent,
    saveActiveFile,
    activeFileUpdated,
    setActiveFileUpdated,
    editedFiles,
    clearEditedFiles,
    handleChangeActiveFile,
    handleDeleteFile,
    handleExportFile,
    handleCreateFile,
  }

}

export { useManageFiles };
