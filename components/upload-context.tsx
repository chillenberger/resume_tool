'use client'
import { useState, useEffect } from 'react';
import { scrapeUrl, updateDoc } from '../services/context-service';
import { getDocs } from '../utils/context';
import { Dispatch, SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile, faAdd } from '@fortawesome/free-solid-svg-icons';
import { Doc } from '../types';
import Loader from './loader';

export default function UploadContext({ setActiveDoc, activeDoc, onComplete }: { setActiveDoc: Dispatch<SetStateAction<Doc | null>>, activeDoc: Doc | null, onComplete: () => void }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contextDocs, setContextDocs] = useState<{[key: string]: string}>({});

  async function fetchDocs() {
    const content = await getDocs();
    for ( const doc of content ) {
      contextDocs[doc.title] = doc.content;
    }
    setContextDocs(contextDocs);
  }

  async function saveUpdatedFiles() {
    setIsLoading(true);

    // save current doc state
    if ( activeDoc ) {
      contextDocs[activeDoc.title] = activeDoc.content;
    }

    // update docs on server. 
    try {
      for ( const [title, content] of Object.entries(contextDocs)) {
        const formData = new FormData();
        formData.append("doc", content);
        formData.append("title", title);
        await updateDoc(formData);
      }
      onComplete();
    } catch (error) {
      console.error("Error saving documents: ", error);
    } finally {
      setIsLoading(false);
    }
    
  }

  function updateLocalDocContent(title: string) {
    if( !activeDoc ) return;
    setContextDocs(prev => ({
      ...prev,
      [title]: activeDoc.content
    }));
  }

  // Job description file is required, so we add it by default.
  useEffect(() => {
    const jobDescriptionDoc: Doc = {title: 'job-description.md', content: ''};
    new Promise((resolve) => {
      setTimeout(resolve, 3000); // Ensure some delay for loader.
    }).then(() => {
      fetchDocs();
      setContextDocs({ 'job-description.md': 'Place holder content for job description.' });
      setActiveDoc(jobDescriptionDoc);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [])

  // Manually add a new doc to doc list. 
  const addDoc = () => {
    const newDoc: Doc = { title: `context-${Object.keys(contextDocs).length + 1}.md`, content: '' };
    setActiveDoc(newDoc);

    contextDocs[newDoc.title] = '';
    setContextDocs(contextDocs);
  }

  // Add new doc by scraping a URL
  const scrapeNewUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();

    await scrapeUrl(formData);
    await fetchDocs();
    setIsLoading(false);
  }

  return (
    <div  className="flex flex-col justify-between h-full">
      <div>
        <div className="flex space-x-2 flex-col">
          {Object.keys(contextDocs).map((title, key) => (
            <div key={key} className={"flex flex-row gap-2"}>
              <button type="button" onClick={() => {
                updateLocalDocContent(activeDoc?.title || '');
                setActiveDoc({ title: title, content: contextDocs[title] });
              }} className="text-white active:bg-blue-50" disabled={isLoading}><FontAwesomeIcon icon={faFile} /></button>
              <div className="font-bold">{title}</div>
            </div>
          ))}
          <form onSubmit={scrapeNewUrl}>
              <div className="flex flex-row gap-2 items-center">
                <button type="button" onClick={addDoc} disabled={isLoading}><FontAwesomeIcon icon={faAdd} /></button>
                <input type="url" name="url" placeholder="Add URL" />
                <input type="hidden" name="title" value={`context-${Object.keys(contextDocs).length + 1}.md`} />
              </div>
          </form>

          
        </div>
      </div>

      <button className="flex flex-col gap-4 bg-blue-400 rounded-md border-neutral-50 p-2 mt-4 hover:cursor-pointer"
        onClick={saveUpdatedFiles} disabled={isLoading}>{isLoading ? <Loader /> : 'Generate Resume'}</button>
    </div>
  )
}