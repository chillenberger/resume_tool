import { useState, useEffect, useCallback, useReducer } from 'react';
import { getFiles as getServerFiles, syncServerToFiles, exportHtmlToPdf, deleteFile as deleteServerFile } from '../services/file-service';
import { Doc } from '../types';

type fileOperations = "add" | "update" | "delete";

function fileReducer(state: {[key: string]: string} = {}, action?: { type: fileOperations, title?: string, content?: string }) {
  if (!action) {
    return state;
  }
  switch(action.type) {
    case 'add':
    case 'update':
      if (!action.title || action.content === undefined) {
        throw new Error("Title and content must be provided for add or update actions");
      }
      let test = {...state, [action.title]: action.content};
      return test;
    case 'delete':
      if (!action.title) {
        throw new Error("Title must be provided for delete action");
      }
      const { [action.title]: _, ...rest } = state;
      return rest;
  }
}

export function useManageFiles(folder: string) {
  const [files, fileDispatch] = useReducer(fileReducer, {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getFiles() {
    setIsLoading(true);
    try {
      const files = await getServerFiles(folder);
      files.forEach(({title, content}) => {
        fileDispatch({ type: 'add', title, content });
      });
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

  const syncFilesWithServer = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs: Doc[] = Object.entries({ ...files }).map(([title, content]) => ({ title, content }));
      await syncServerToFiles(docs, folder);
    } catch (error) {
      setError("Failed to sync documents");
    } finally {
      setIsLoading(false);
    }
  }, [files]);

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
    fileDispatch,
    isLoading, 
    getFiles,
    exportFile,
    error
  }
}