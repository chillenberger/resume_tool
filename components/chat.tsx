
import useChat from '@/hooks/use-chat';
import { useEffect, useState } from 'react';
import Loader from '@/components/loader';
import useLogger from '@/hooks/use-logger';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser,
  faPaperPlane, 
  faRobot,
  faCircleExclamation, 
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import { ChatResponse } from '@/types';

interface ChatWindowProps {
  loadDir: () => void;
  project: string;
  folders: string[] | null;
  onRequest: () => Promise<void>;
}

export default function ChatWindow({
    loadDir,
    project,
    onRequest,
    folders
}: ChatWindowProps) {
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, error: chatError, newChat, chatRequestStream, streamContent, chatStreamAction, lastUserQuery } = useChat(project, folders);
  const logger = useLogger();
  const isLoading = chatLoading;

  // useEffect(() => {
  //   loadChatByProjectName(project);
  // }, [])

  // On response clear local edited files tracker and reload all files if changes by chat. 
  useEffect(() => {
    loadDir()
  }, [conversation])

  function handleNewChat() {
    newChat();
    logger.newSession();
  }

  const handleNewRequestStream = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    const userRequest = formData.get('userQuery') as string;

    await onRequest();
    await chatRequestStream(userRequest, 'test-stream-project', folders || []);
  }

  return (
    <div className="w-full h-full">
      <button onClick={handleNewChat} className="mb-2 underline text-sm hover:cursor-pointer"><FontAwesomeIcon icon={faRefresh} /></button>
      <form onSubmit={handleNewRequestStream} className=" bg-white rounded-lg p-2 relative">
        <textarea name="userQuery" className="chat-input" placeholder="Discuss with ChatGPT"></textarea>
        {responseId && <input type="hidden" name="previousResponseId" value={responseId}/>}
        <div className="absolute top-1 right-1"><button type="submit" className="hover:cursor-pointer" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</button></div>
      </form>
      {(chatError) && <div className="text-red-500">{chatError}</div>}

      <div className="flex flex-row gap-2 justify-center items-center my-2">
        {conversation.map((_, i) => (
          <button key={i} className={`w-2 h-2 bg-neutral-50 rounded-xl hover:bg-neutral-200 hover:w-3 hover:h-3 ${chatIndex === i ? 'bg-neutral-300 w-3 h-3' : ''}`} onClick={() => {setChatIndex(i)}}></button>
        ))}
      </div>

      {(conversation.length > 0 && chatIndex < conversation.length - 1) ? 
      <ConversationUI userQuery={conversation[chatIndex]?.request || ''} chatResponse={conversation[chatIndex]?.response || {response: '', error: false}}/> : 
      <ConversationUI userQuery={lastUserQuery} chatResponse={{response: streamContent, error: false, lastResponseId: ''}} chatAction={chatStreamAction}/>}
    </div>
  )
}

function ConversationUI({userQuery, chatResponse, chatAction = null}: {userQuery: string; chatResponse: ChatResponse; chatAction?: string | null}) {
  return (
    <div className="overflow-y-auto px-2">
      {userQuery.length > 0 && 
      <div className="py-2 w-[75%] ms-auto border-r-1 border-neutral-50/50">
        <pre className="whitespace-pre-wrap text-stone-400 px-1">{userQuery}</pre>
      </div>}
      
      {chatAction && <div className="text-stone-400">{chatAction}</div>}
      {chatResponse.response.length > 0 && 
      <div className="py-2">
        {chatResponse?.error ? 
          <span className="text-red-500">Error processing your request.</span> : 
          <pre className="whitespace-pre-wrap text-stone-200 px-1">{chatResponse.response}</pre>}
      </div>}
      
    </div>
  )
}