import { useState, useEffect, useCallback } from 'react';
import { updateDoc } from '../services/context-service';
import { getDocs } from '../utils/context';
import { Doc } from '../types';

export default function useContextDocs() {
  const [contextDocs, setContextDocs] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  async function fetchDocs() {
    setIsLoading(true);
    try {
      const content = await getDocs();
      setContextDocs(content.reduce((acc: {[key: string]: string}, doc) => {
        acc[doc.title] = doc.content;
        return acc;
      }, {}));
    } catch (error) {
      setError("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }

  // Maintain server files and client files in sync.
  useEffect(() => {
    if ( Object.keys(contextDocs).length > 0 ) syncContextWithServer();
  }, [contextDocs])

  const syncContextWithServer = useCallback(async () => {
    setIsLoading(true);
    try {
      const savingDocs = Object.entries(contextDocs).map(([title, content]) => {
        const formData = new FormData();
        formData.append("doc", content);
        formData.append("title", title);
        return updateDoc(formData);
      });
      await Promise.all(savingDocs);
    } catch (error) {
      setError("Failed to sync documents");
    } finally {
      setIsLoading(false);
    }
  }, [contextDocs]);

  function createDoc(doc?: Doc) {
    const newDoc: Doc = {
      title: doc?.title || `context-${Object.keys(contextDocs).length + 1}.md`,
      content: doc?.content || ''
    };

    setContextDocs(prev => ({...prev, [newDoc.title]: ''}));
    return newDoc;
  }

  return {
    contextDocs,
    setContextDocs,
    isLoading, 
    fetchDocs,
    createDoc, 
    error
  }
}