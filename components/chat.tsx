
import useChat from '../hooks/chat-hook';
import { useEffect, useState } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Doc } from '../types';
import Loader from './loader';
import { useManageFiles} from '../hooks/file-manager-hook';
import FileTree from './file-tree';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, 
  faPaperPlane, 
  faRobot,
  faFileCircleXmark,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';

interface ChatWindowProps {
  setActiveDoc: Dispatch<SetStateAction<Doc | null>>, 
  activeDoc: Doc | null,
  activeDocUpdated: boolean, 
  setActiveDocUpdated: Dispatch<SetStateAction<boolean>>
}

export default function ChatWindow({
    setActiveDoc, 
    activeDoc, 
    activeDocUpdated, 
    setActiveDocUpdated}: ChatWindowProps) {
  const { files: docs, fileDispatch, isLoading: docsLoading, error: fileError, exportFile } = useManageFiles('temp');
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, generateResumeRequest, chatRequest, error: chatError } = useChat();
  const [discussDoc, setDiscussDoc] = useState<string | null>(null);

  const isLoading = docsLoading || chatLoading;

  function handleExportFile(title: string) {
    exportFile(title, activeDoc?.title === title ? activeDoc.content : docs[title]);
  }

  useEffect(() => {
    setActiveDoc(null);
    setActiveDocUpdated(false);
    generateResumeRequest();      
  }, []);

  useEffect(() => {
    if( discussDoc === activeDoc?.title && activeDocUpdated ) {
      setDiscussDoc(null);
    }
  }, [activeDocUpdated])

  useEffect(() => {
    const lastChatResponseFiles = conversation?.[conversation.length - 1]?.response?.response?.files;
    if ( !lastChatResponseFiles ) return;

    const newAndUpdatedFiles: { [key: string]: string } = {};

    if ( activeDoc ) {
      fileDispatch({ type: 'update', title: activeDoc.title, content: activeDoc.content });
      setActiveDocUpdated(false);
    }

    lastChatResponseFiles.forEach(file => {
      newAndUpdatedFiles[file.title] = file.content;
      fileDispatch({ type: 'update', title: file.title, content: file.content });
    })

    if ( lastChatResponseFiles[0] ) {
      setActiveDoc({title: lastChatResponseFiles[0].title, content: lastChatResponseFiles[0].content});
    } else if( activeDoc ) {
      setActiveDoc( activeDoc )
    } else {
      setActiveDoc(null);
    }
       
  }, [conversation])

  function handleNewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const userRequest = formData.get('userQuery') as string;

    setActiveDocUpdated(false);
    if( discussDoc ) {
      formData.append('doc', JSON.stringify({title: discussDoc, content: docs[discussDoc as keyof typeof docs]}));
      setDiscussDoc(null);
    }

    const doc: Doc | undefined = docs[discussDoc as keyof typeof docs] && discussDoc ? {title: discussDoc, content: docs[discussDoc as keyof typeof docs]} : undefined;

    event.currentTarget.reset();
    chatRequest(userRequest, doc);
  }

  function handleChangeFile(title: string) {
    if( activeDoc ) fileDispatch({ type: 'update', title: activeDoc.title, content: activeDoc.content });
    setActiveDoc({ title, content: docs[title] });
    setActiveDocUpdated(false);
  }

  function handleSetFileAsContext(title: string) {
    if( activeDoc ) fileDispatch({ type: 'update', title: activeDoc.title, content: activeDoc.content });
    setDiscussDoc(title);
    setActiveDocUpdated(false);
  }

  return (
      <div className="flex flex-col gap-3 p-3 w-lg h-full">
        <FileTree files={Object.entries(docs).map(([title, content]) => ({
          title,
          activeFile: activeDoc?.title === title,
          onFileSelect: handleChangeFile,
          onFileExport: handleExportFile,
          onFileSetAsContext: handleSetFileAsContext
        }))} />
        
        {fileError && <div className="text-red-500">{fileError}</div>}
        <form onSubmit={handleNewRequest} className=" bg-white rounded-lg p-2 relative">
          {responseId ? <>
            <textarea name="userQuery" className="chat-input" placeholder="Discuss with ChatGPT"></textarea>
            <input type="hidden" name="previousResponseId" value={responseId}/>
            <div className="absolute top-1 right-1"><button type="submit" className="hover:cursor-pointer" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</button></div>
            {discussDoc && <div className="text-neutral-800">{discussDoc}<button type="button" aria-label="remove doc" onClick={() => setDiscussDoc(null)}><FontAwesomeIcon icon={faFileCircleXmark} /></button></div>}
          </> : <Loader />
          }
        </form>
        {chatError && <div className="text-red-500">{chatError}</div>}

        <div className="flex flex-row gap-2 justify-center items-center">
          {conversation.map((_, i) => (
            <button key={i} className={`w-2 h-2 bg-neutral-50 rounded-xl hover:bg-neutral-200 hover:w-3 hover:h-3 ${chatIndex === i ? 'bg-neutral-300 w-3 h-3' : ''}`} onClick={() => {setChatIndex(i)}}></button>
          ))}
        </div>
        {conversation.length > 0 &&
          <div className="overflow-y-auto">
            {conversation[chatIndex]?.response?.response?.special_instructions && <div className="border-b-1 border-neutral-50/50 pb-2" ><FontAwesomeIcon icon={faCircleExclamation} />{': '}{conversation[chatIndex]?.response?.response?.special_instructions}</div>}
            <div className="border-b-1 border-neutral-50/50 py-2">
              <FontAwesomeIcon icon={faUser} />{': '}
              {conversation[chatIndex]?.request }
            </div>
            <div className="pt-2">
              <FontAwesomeIcon icon={faRobot} />{': '}
              {conversation[chatIndex]?.response?.error ? <span className="text-red-500">Error processing your request.</span> : <span>{conversation[chatIndex]?.response?.response?.message}</span>}
            </div>
          </div>
        }
      </div>
  )
}
