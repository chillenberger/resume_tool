
import useChat from '@/hooks/use-chat';
import { useEffect } from 'react';
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
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, chatRequest, error: chatError, newChat} = useChat(project, folders);
  const logger = useLogger();
  const isLoading = chatLoading;

  // useEffect(() => {
  //   loadChatByProjectName(project);
  // }, [])

  // On response clear local edited files tracker and reload all files if changes by chat. 
  useEffect(() => {
    const lastChatResponseFiles = conversation?.[conversation.length - 1]?.response?.response?.system_actions;
    if ( lastChatResponseFiles ) {
      console.log("Files were changed by chat response, reloading directory:", lastChatResponseFiles);
      loadDir()
    };
  }, [conversation])

  async function handleNewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    const userRequest = formData.get('userQuery') as string;

    await onRequest()
    chatRequest(userRequest, project);
  }

  function handleNewChat() {
    newChat();
    logger.newSession();
  }

  return (
    <div className="w-full h-full">
      <button onClick={handleNewChat} className="mb-2 underline text-sm hover:cursor-pointer"><FontAwesomeIcon icon={faRefresh} /></button>
      <form onSubmit={handleNewRequest} className=" bg-white rounded-lg p-2 relative">
        <textarea name="userQuery" className="chat-input" placeholder="Discuss with ChatGPT"></textarea>
        {responseId && <input type="hidden" name="previousResponseId" value={responseId}/>}
        <div className="absolute top-1 right-1"><button type="submit" className="hover:cursor-pointer" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</button></div>
      </form>
      {(chatError) && <div className="text-red-500">{chatError}</div>}

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