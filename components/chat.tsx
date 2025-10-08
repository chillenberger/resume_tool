
import useChat from '../hooks/chat-hook';
import { useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Doc } from '../types';
import Loader from './loader';
import { useManageFiles} from '../hooks/file-manager-hook';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, 
  faPaperPlane, 
  faRobot, 
  faFile, 
  faFileExport 
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
  const { files: docs, setFiles: setDocs, isLoading: docsLoading, error: fileError, exportFile } = useManageFiles('temp');
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, generateResumeRequest, chatRequest, error: chatError } = useChat();

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
    const lastChatResponseFiles = conversation?.[conversation.length - 1]?.response?.response?.files;
    if ( !lastChatResponseFiles ) return;
    const newAndUpdatedFiles: { [key: string]: string } = {};
    lastChatResponseFiles.forEach(file => {
      newAndUpdatedFiles[file.title] = file.content
    })
    setDocs(prev => ({...prev, ...newAndUpdatedFiles}))

    if ( lastChatResponseFiles[0] ) {
      setActiveDoc({title: lastChatResponseFiles[0].title, content: lastChatResponseFiles[0].content});
    } else if( activeDoc ) {
      setActiveDoc( activeDoc )
    } else {
      setActiveDoc(null);
    }
    
    // setActiveDocUpdated(false);
  }, [conversation])

  function handleNewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const userRequest = formData.get('userQuery') as string;
    
    // if( activeDocUpdated && Object.keys(docs).length > 0 && activeDoc ) {
    //   formData.append('doc', JSON.stringify(activeDoc));
    // } 

    chatRequest(userRequest);
  }

  function handleChangeFile(title: string) {
    if( !activeDoc ) return;
    setDocs(prev => activeDoc ? ({...prev, [activeDoc.title]: activeDoc.content}) : prev);
    setActiveDoc({ title, content: docs[title] });
  }

  return (
      <div className="flex flex-col gap-3 p-3 w-max-[50rem] h-full">
        <div className="flex flex-col gap-1 mb-6">
          {Object.keys(docs).length > 0 && 
          Object.entries(docs).map(([title, _], key) => (
            <div key={key} className={`flex flex-row gap-2 rounded-sm ${activeDoc?.title === title ? 'bg-gray-800' : ''}`}>
              <button className="truncate hover:cursor-pointer" onClick={() => handleChangeFile(title)} disabled={isLoading}><FontAwesomeIcon icon={faFile}/> {title}</button>
              <button onClick={() => handleExportFile(title)} disabled={isLoading}><FontAwesomeIcon icon={faFileExport} /></button>
            </div>
          ))}
        </div>
        {fileError && <div className="text-red-500">{fileError}</div>}
        <form onSubmit={handleNewRequest} className=" bg-white rounded-lg p-2 relative">
          {responseId ? <>
            <textarea name="userQuery" className="w-full" placeholder="Discuss with ChatGPT"></textarea>
            <input type="hidden" name="previousResponseId" value={responseId}/>
            <div className="absolute top-1 right-1"><button type="submit" className="hover:cursor-pointer" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</button></div>
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
            <div className="border-b-1 border-neutral-50/50 pb-2">
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
