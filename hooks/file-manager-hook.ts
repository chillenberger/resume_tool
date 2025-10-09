import { useState, useEffect, useCallback } from 'react';
import { getFiles as getServerFiles, updateBulkFiles, exportHtmlToPdf, deleteFile as deleteServerFile } from '../services/file-service';
import { Doc } from '../types';

export function useManageFiles(folder: string) {
  const [files, setFiles] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  async function getFiles() {
    setIsLoading(true);
    try {
      const content = await getServerFiles(folder);
      setFiles(content.reduce((acc: {[key: string]: string}, doc) => {
        acc[doc.title] = doc.content;
        return acc;
      }, {}));
    } catch (error) {
      setError("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }

  // If files change sync server.
  useEffect(() => {
    if (Object.keys(files).length > 0) syncFilesWithServer();
  }, [files]);

  const syncFilesWithServer = useCallback(async (newFiles?: {[key: string]: string}) => {
    setIsLoading(true);
    try {
      const docs: Doc[] = Object.entries({ ...files, ...newFiles }).map(([title, content]) => ({ title, content }));
      await updateBulkFiles(docs, folder);
    } catch (error) {
      setError("Failed to sync documents");
    } finally {
      setIsLoading(false);
    }
  }, [files]);

  function createFile(doc?: Doc) {
    const newDoc: Doc = {
      title: doc?.title || `context-${Object.keys(files).length + 1}.md`,
      content: doc?.content || ''
    };

    setFiles(prev => ({...prev, [newDoc.title]: ''}));
    return newDoc;
  }

  async function deleteFile(title: string) {
    const {[title]: _, ...rest} = files;
    await deleteServerFile(title, folder);
    setFiles(rest);
  }

  async function exportFile(title: string, context?: string) {
    const formData = new FormData();
    formData.append('doc', context || files[title]);
    formData.append('docName', title);
    if (context) {
      formData.append('context', context);
    }
    await exportHtmlToPdf(formData);
  }

  return {
    files,
    setFiles,
    isLoading, 
    getFiles,
    createFile,
    exportFile,
    syncFilesWithServer,
    deleteFile,
    error
  }
}