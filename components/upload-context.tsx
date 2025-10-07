'use client'
import { useState, useEffect } from 'react';
import { scrapeUrl, updateDocs } from '../services/context-service';
import { getDocs } from '../utils/context';
import { Dispatch, SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile, faAdd } from '@fortawesome/free-solid-svg-icons';
import { Doc } from '../types';
import Loader from './loader';

export default function UploadContext({ setActiveDoc, activeDoc, onComplete }: { setActiveDoc: Dispatch<SetStateAction<Doc | null>>, activeDoc: Doc | null, onComplete: () => void }) {
  const [contextDocs, setContextDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function fetchFiles() {
    const content = await getDocs();
    setContextDocs(content || []);
  }

  async function saveUpdatedFile() {
    if( !activeDoc ) return;
    const formData = new FormData();
    formData.append("doc", JSON.stringify(activeDoc));
    await updateDocs(formData);
    await fetchFiles();
  }

  // Job description file is required, so we add it by default.
  useEffect(() => {
    const jobDescriptionDoc: Doc = {title: 'job-description.md', content: ''};
    new Promise((resolve) => {
      setTimeout(resolve, 3000); // Ensure some delay for loader.
    }).then(() => {
      setContextDocs([jobDescriptionDoc]);
      setActiveDoc(jobDescriptionDoc);
      setIsLoading(false);
    });
  }, [])

  // Add a new doc to doc list. 
  const addDoc = () => {
    const newDoc: Doc = { title: `context-${contextDocs.length + 1}.md`, content: '' };
    setContextDocs([...contextDocs, newDoc]);
    setActiveDoc(newDoc);
  }

  const scrapeNewUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    await scrapeUrl(formData);
    await fetchFiles();
    setIsLoading(false);
  }

  const generateResume = async () => {
    setIsLoading(true);
    await saveUpdatedFile();
    setIsLoading(false);
    onComplete();
  }

  return (
    <div  className="flex flex-col justify-between h-full">
      <div>
        <div className="flex space-x-2 flex-col">
          {contextDocs.map((doc, key) => (
            <div className={"flex flex-row gap-2"} key={key}>
              <button type="button" onClick={async () => {
                await saveUpdatedFile();
                setActiveDoc({ title: doc.title, content: doc.content });
              }} className="text-white active:bg-blue-50" disabled={isLoading}><FontAwesomeIcon icon={faFile} /></button>
              <div className="truncate">{doc.title}</div>
            </div>
          ))}
          <form onSubmit={scrapeNewUrl}>
              <div className="flex flex-row gap-2 items-center">
                <button type="button" onClick={addDoc} disabled={isLoading}><FontAwesomeIcon icon={faAdd} /></button>
                <input type="url" name="context" placeholder="Add URL" />
                <input type="hidden" name="title" value={`context-${contextDocs.length + 1}.md`} />
              </div>
          </form>
        </div>
      </div>

      <button className="flex flex-col gap-4 bg-blue-400 rounded-md border-neutral-50 p-2 mt-4 hover:cursor-pointer"
        onClick={generateResume} disabled={isLoading}>{isLoading ? <Loader /> : 'Generate Resume'}</button>
    </div>
  )
}