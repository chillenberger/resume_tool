import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  syncServerToDir,
  exportHtmlToPdf, 
  getDirContents,
  createNewProject,
} from '@/services/file-service';
import { Dir, Doc } from '../types';
import { getDirFile, addFileToDir, deleteFileFromDir } from '@/lib/file';
import path from 'path';

export function useManageFiles(folder: string) {
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