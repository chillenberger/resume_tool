import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  syncServerToDir,
  exportHtmlToPdf, 
  getDirContents} from '@/services/file-service';
import { Dir, Doc } from '../types';
import { getDirFile, addFileToDir } from '@/lib/file';

export function useManageFiles(folder: string) {
  const [dir, setDir] = useState<Dir>({ title: folder, children: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

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
      return getDirFile(path, dir);
    } catch (error) {
      setError("Failed to fetch file");
    }
  }

  async function updateFile(path: string, content: string) {
    let file = getFile(path);
    if ( !file ) throw new Error(`File ${path} not found for update`);
    file.content = content;
    setDir({ ...dir });
  }

  function addFile(fullPath: string, content: string) {
    const path = fullPath.split('/');
    const fileName = path.pop();

    if ( !fileName ) throw new Error("Invalid file name");
    
    const newDoc: Doc = { title: fileName, content };
    try {
      let existingFile = getDirFile(fullPath, dir);
      existingFile.content = content;
      setDir({ ...dir });
      return;
    } catch (error) {
      addFileToDir(path.join('/'), dir, newDoc);
      setDir({ ...dir });
    }
  }

  useEffect(() => {
    loadDir();
  }, [])

  // If files change sync server.
  useEffect(() => {
    if ( !isInitialized.current ) { isInitialized.current = true; return; };
    syncDirWithServer();
  }, [dir]);

  const syncDirWithServer = useCallback(async () => {
    setIsLoading(true);
    try {
      await syncServerToDir(dir, folder);
    } catch (error) {
      setError("Failed to sync directory");
    } finally {
      setIsLoading(false);
    }
  }, [dir]);

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
    addFile,
    isLoading,
    exportFile,
    error
  }
}