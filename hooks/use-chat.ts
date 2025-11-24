import { chat, getChatLog, initializeAgent } from '@/services/chat-service';
import { ChatResponse, Conversation, FileAction } from '@/types';
import { useEffect, useState, useCallback, useContext } from 'react';
import { ChatSessionContext } from '@/components/session';

export default function useChat(projectDirectory: string, folders: string[] | null) {
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIndex, setChatIndex] = useState<number>(0);
  const [timeLastRequest, setTimeLastRequest] = useState<string>(new Date().toISOString());
  const {sessionValue, updateSession} = useContext(ChatSessionContext);
  
  useEffect(() => {
    if( folders ) initializeAgent(projectDirectory, folders);
  }, [projectDirectory, folders]) // Re-initialize agent when project directory changes

  const chatRequest = useCallback(async (userQuery: string, projectName: string, fileActions: {[key: string]: FileAction}) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('userQuery', userQuery)
    formData.append('projectName', projectName);
    if( responseId ) {
      formData.append('previousResponseId', responseId);
    }
    if( fileActions && Object.keys(fileActions).length > 0 ) {
      formData.append('fileActionsTaken', JSON.stringify(fileActions)); 
    }


    chat(formData, sessionValue, timeLastRequest)
    .then((resp: ChatResponse) => {
      setResponseId(resp.lastResponseId);
      setTimeLastRequest(new Date().toISOString());

      setConversation((prevConversation) => {
        const newConversation: Conversation = {
          request: userQuery,
          response: resp
        };

        setChatIndex(prevConversation.length); // +1 for new entry but -1 for 0 index.
        return [...prevConversation, newConversation];
      });
    })
    .catch(error => {
      setError("Error submitting chat request");
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [responseId]);

  const loadChatByProjectName = useCallback((projectName: string) => {
    setIsLoading(true);
    getChatLog(projectName).then(logs => {
      setConversation(logs);
      if ( logs.length > 0 ) {
        setChatIndex(logs.length - 1);
        setResponseId(logs[logs.length -1 ].response.lastResponseId);
      }
    })
    .catch(error => {
      setError("Failed to load chat logs");
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, []);

  const newChat = useCallback(() => {
    setConversation([]);
    setResponseId(null);
    setChatIndex(0);
  }, []);

  return {
    conversation,
    setConversation,
    responseId,
    setResponseId,
    chatIndex,
    setChatIndex,
    isLoading,
    error,
    chatRequest,
    loadChatByProjectName,
    newChat,
  }
}