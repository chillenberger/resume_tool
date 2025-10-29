
import useChat from '@/hooks/use-chat';
import { useEffect} from 'react';
import Loader from '@/components/loader';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser,
  faPaperPlane, 
  faRobot,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';

interface ChatWindowProps {
  loadDir: () => void;
  project: string
  saveActiveFile: () => void;
  editedFiles: {[path: string]: 'created' | 'updated' | 'deleted'};
  clearEditedFiles: () => void;
}

export default function ChatWindow({
    loadDir,
    project,
    saveActiveFile,
    editedFiles,
    clearEditedFiles
}: ChatWindowProps) {
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, chatRequest, error: chatError, loadChatByProjectName } = useChat(project);

  const isLoading = chatLoading;

  useEffect(() => {
    loadChatByProjectName(project);
  }, [])

  useEffect(() => {
    const lastChatResponseFiles = conversation?.[conversation.length - 1]?.response?.response?.file_actions;
    if ( !lastChatResponseFiles ) return;
    loadDir();
  }, [conversation])

  async function handleNewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    const userRequest = formData.get('userQuery') as string;

    
    saveActiveFile();

    clearEditedFiles();
    chatRequest(userRequest, project, editedFiles);
  }

  return (
      <>
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
      </>
  )
}