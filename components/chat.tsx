
import { chat, ChatConversationResponse, generateResume } from '../services/chat-service';
import { useState, useEffect } from 'react';
import { htmlToPdf } from '../services/chat-service';
import { Dispatch, SetStateAction } from 'react';
import { Doc } from '../types';
import Loader from './loader';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileExport } from '@fortawesome/free-solid-svg-icons';
import { faFile } from '@fortawesome/free-solid-svg-icons';
import { faRobot } from '@fortawesome/free-solid-svg-icons';
import { faUser } from '@fortawesome/free-solid-svg-icons';

interface ChatWindowProps {
  setActiveDoc: Dispatch<SetStateAction<Doc | null>>, 
  activeDoc: Doc | null,
  activeDocUpdated: boolean, 
  setActiveDocUpdated: Dispatch<SetStateAction<boolean>>
}

interface Conversation {
  request: string;
  response: ChatConversationResponse;
}

export default function ChatWindow({
    setActiveDoc, 
    activeDoc, 
    activeDocUpdated, 
    setActiveDocUpdated}: ChatWindowProps) {
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [docs, setDocs] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conversationIndex, setConversationIndex] = useState<number>(0);

  const exportFile = (docName: string) => {
    let doc = docs[docName]
    if( docName === activeDoc?.title ) {
      doc = activeDoc.content;
    }

    if( doc ) {
      const formData = new FormData();
      formData.append('doc', doc);
      formData.append('docName', docName);
      htmlToPdf(formData);
    } else {
      console.error(`Document with name ${docName} not found.`);
    }
  }

  useEffect(() => {
    setActiveDoc(null);
    setActiveDocUpdated(false);

    generateResume().then(resp => {
      const newConversation: Conversation = {
        request: 'Please create a resume with the provided data.',
        response: resp
      };

      setConversation([...conversation, newConversation]);
      setPreviousResponseId(resp.lastResponseId || null);
      
      const files = resp?.response?.files;
      if ( files ) {
        const filesMap: { [key: string]: string } = {};
        files.forEach(f => {
          filesMap[f.title] = f.content;
        });

        setDocs(filesMap);
        setActiveDoc( files[0] );
      }
      
    }).catch(error => {
      console.error("Error generating resume: ", error);
    }).finally(() => { setIsLoading(false); });
  }, []);

  async function onChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const userRequest = formData.get('userQuery') as string;
    setIsLoading(true);
    
    try {
      if( activeDocUpdated && Object.keys(docs).length > 0 && activeDoc ) {
        formData.append('doc', JSON.stringify(activeDoc));
      } 
      const request: ChatConversationResponse = {
        response: { message: userRequest, files: [] },
        lastResponseId: previousResponseId,
        error: false
      }

      const resp: ChatConversationResponse = await chat(formData);

      setPreviousResponseId(resp.lastResponseId || null);
      const newConversation: Conversation = {
        request: userRequest,
        response: resp
      }
      setConversation([...conversation, newConversation]);
      setConversationIndex(conversation.length); // +1 for new entry but -1 for 0 index.

      // extract returned files
      if(resp?.response?.files) {
        const newDocs: {[key: string]: string} = {};
        Object.keys(docs).forEach(k => { newDocs[k] = docs[k]; });
        resp.response.files.forEach(f => {
          newDocs[f.title] = f.content;
        })

        setDocs(newDocs);
        if ( resp?.response?.files[0] ) {
          setActiveDoc(resp?.response?.files[0] || null);
        } else if( activeDoc ) {
          setActiveDoc( activeDoc )
        } else {
          setActiveDoc(null);
        }
        setActiveDocUpdated(false);
      }
    } catch (error) {
      console.error("Error in chat submission:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
      <div className="flex flex-col gap-3 p-3 w-max-[50rem] h-full">
        {Object.keys(docs).length > 0 && 
        Object.entries(docs).map(([title, content], key) => (
          <div key={key} className="flex flex-row gap-1">
            <button className="truncate" onClick={() => {
              if ( activeDoc ) {
                docs[activeDoc.title] = activeDoc?.content || content;
              }
              setActiveDoc({ title, content });
              }} disabled={isLoading}><FontAwesomeIcon icon={faFile}/> {title}</button>
            <button onClick={() => exportFile(title)} disabled={isLoading}><FontAwesomeIcon icon={faFileExport} /></button>
          </div>
        ))}
        <form onSubmit={onChatSubmit} className="flex flex-row gap-3 bg-white rounded-lg p-2">
          {!isLoading && previousResponseId && <>
            <input type="text" name="userQuery" className="text-gray-500 w-full"/>
            <input type="hidden" name="previousResponseId" value={previousResponseId}/>
            <button type="submit" className="bg-gray-800 text-white py-2 px-4 rounded" disabled={isLoading}>Send</button>
          </>
          }
          {isLoading && <div className="flex justify-center items-center w-full"><Loader /></div>}
        </form>

        <div className="flex flex-row gap-2 justify-center items-center">
          {conversation.map((_, i) => (
            <button key={i} className={`w-2 h-2 bg-neutral-50 rounded-xl hover:bg-neutral-200 hover:w-3 hover:h-3 ${conversationIndex === i ? 'bg-neutral-300 w-3 h-3' : ''}`} onClick={() => {setConversationIndex(i)}}></button>
          ))}
        </div>
        {conversation.length > 0 &&
          <div className="overflow-y-auto">
            <div className="border-b-1 border-neutral-50/50 pb-2">
              <FontAwesomeIcon icon={faUser} />{': '}
              {conversation[conversationIndex]?.request }
            </div>
            <div className="pt-2">
              <FontAwesomeIcon icon={faRobot} />{': '}
              {conversation[conversationIndex]?.response?.error ? <span className="text-red-500">Error processing your request.</span> : <span>{conversation[conversationIndex]?.response?.response?.message}</span>}
            </div>
          </div>
        }
      </div>
  )
}
