'use client'
import { useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile, faAdd, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Doc } from '../types';
import Loader from './loader';
import { useManageFiles } from '../hooks/file-manager-hook';
import useUrlScraper from '../hooks/scraper-hook';
import FileTree from './file-tree';

export default function UploadContext({ setActiveDoc, activeDoc, onComplete }: { setActiveDoc: Dispatch<SetStateAction<Doc | null>>, activeDoc: Doc | null, onComplete: () => void }) {
  const { files, setFiles, isLoading: docsLoading, getFiles, createFile, error: contextError, syncFilesWithServer, deleteFile } = useManageFiles('jobs');
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
      setTimeout(resolve, 1000);
    })
    .then(getFiles)
    // Overwrite job description doc to new empty job description. 
    .then(() => {
      createFile(jobDescriptionDoc);
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
        createFile(doc);
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
    createFile(newDoc);
    setActiveDoc(newDoc);
  }

  function handleDeleteDoc(title: string) {
    if( activeDoc?.title === title ) {
      setActiveDoc(null);
    }
    deleteFile(title);
  }

  async function handleComplete() {
    await syncFilesWithServer(activeDoc ? { [activeDoc.title]: activeDoc.content } : undefined);
    onComplete();
  }

 return (
    <div  className="flex flex-col justify-between w-xs h-full">
      <div className="flex space-x-2 flex-col">
        <FileTree files={Object.entries(files).map(([title, _]) => ({
          title,
          activeFile: activeDoc?.title === title,
          onFileSelect: handleFileChange,
          onFileDelete: handleDeleteDoc
        }))} />
        <form onSubmit={handleScrapeUrl}>
          <div className="flex flex-row gap-2 items-center  px-2 py-1">
            <button type="button" onClick={handleCreateDoc} disabled={isLoading} aria-label="Add Document"><FontAwesomeIcon icon={faAdd} /></button>
            <input type="url" name="url" placeholder="Add URL" />
            <input type="hidden" name="title" value={`context-${Object.keys(files).length + 1}.md`} />
          </div>
        </form>
      </div>

      <div className="text-red-500">{contextError || scrapeError}</div>
      <button className="flex flex-col gap-4 bg-blue-400 rounded-md border-neutral-50 p-2 mt-4 hover:cursor-pointer"
        onClick={handleComplete} disabled={isLoading}>{isLoading ? <Loader /> : 'Generate Resume'}</button>
    </div>
  )
}
