'use client'
import { useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile, faAdd } from '@fortawesome/free-solid-svg-icons';
import { Doc } from '../types';
import Loader from './loader';
import { useManageFiles } from '../hooks/file-manager-hook';
import useUrlScraper from '../hooks/scraper-hook';

export default function UploadContext({ setActiveDoc, activeDoc, onComplete }: { setActiveDoc: Dispatch<SetStateAction<Doc | null>>, activeDoc: Doc | null, onComplete: () => void }) {
  const { files, setFiles, isLoading: docsLoading, fetchDocs, createDoc, error: contextError, syncFilesWithServer } = useManageFiles('jobs');
  const { urlToDoc, isLoading: scrapeLoading, error: scrapeError } = useUrlScraper();

  const isLoading = docsLoading || scrapeLoading;

  function saveActiveDoc() {
    setFiles(prev => activeDoc ? ({...prev, [activeDoc.title]: activeDoc.content}) : prev);
  }

  function handleFileChange(title: string) {
    if( !activeDoc ) return;
    saveActiveDoc();
    setActiveDoc({ title, content: files[title] });
  }

  useEffect(() => {
    const jobDescriptionDoc: Doc = {title: 'job-description.md', content: 'Place holder content for job description.'};

    new Promise((resolve) => {
      // Ensure some delay so people see awesome loader.
      setTimeout(resolve, 3000);
    })
    .then(fetchDocs)
    // Overwrite job description doc to new empty job description. 
    .then(() => {
      createDoc(jobDescriptionDoc);
      setActiveDoc(jobDescriptionDoc);
    });
  }, []) // Empty dependency array = runs once on mount

  function handleScrapeUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    urlToDoc(formData).then( (doc: Doc | undefined) => {
      if ( doc ) {
        saveActiveDoc();
        createDoc(doc);
        setActiveDoc(doc);
      }
    });
  }

  function handleCreateDoc() {
    const newDoc: Doc = {
      title: `context-${Object.keys(files).length + 1}.md`,
      content: ''
    };
    saveActiveDoc();
    createDoc(newDoc);
    setActiveDoc(newDoc);
  }

  async function handleComplete() {
    await syncFilesWithServer(activeDoc ? { [activeDoc.title]: activeDoc.content } : undefined);
    onComplete();
  }

 return (
    <div  className="flex flex-col justify-between h-full">
      <div>
        <div className="flex space-x-2 flex-col">
          {Object.keys(files).map((title, key) => (
            <div key={key} className={`flex flex-row gap-2 rounded-sm ${activeDoc?.title === title ? 'bg-gray-800' : ''}`}>
              <button type="button" aria-label={`Edit ${title}`} onClick={() => {
                handleFileChange(title);
              }} className="text-white hover:cursor-pointer" disabled={isLoading || activeDoc?.title === title}><FontAwesomeIcon icon={faFile} /></button>
              <div className="font-bold">{title}</div>
            </div>
          ))}
          <form onSubmit={handleScrapeUrl}>
              <div className="flex flex-row gap-2 items-center">
                <button type="button" onClick={handleCreateDoc} disabled={isLoading} aria-label="Add Document"><FontAwesomeIcon icon={faAdd} /></button>
                <input type="url" name="url" placeholder="Add URL" />
                <input type="hidden" name="title" value={`context-${Object.keys(files).length + 1}.md`} />
              </div>
          </form>
        </div>
      </div>

      <div className="text-red-500">{contextError || scrapeError}</div>
      <button className="flex flex-col gap-4 bg-blue-400 rounded-md border-neutral-50 p-2 mt-4 hover:cursor-pointer"
        onClick={handleComplete} disabled={isLoading}>{isLoading ? <Loader /> : 'Generate Resume'}</button>
    </div>
  )
}
