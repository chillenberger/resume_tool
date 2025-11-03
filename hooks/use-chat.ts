import { chat, getChatLog, initializeAgent } from '../services/chat-service';
import { ChatResponse, Conversation } from '../types';
import { useEffect, useState } from 'react';
import { FileAction } from '../types';

export default function useChat(projectDirectory: string) {
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIndex, setChatIndex] = useState<number>(0);
  
  useEffect(() => {
    initializeAgent(projectDirectory);
  }, [])

  function chatRequest(userQuery: string, projectName: string, fileActions: {[key: string]: FileAction}) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('userQuery', userQuery)
    formData.append('projectName', projectName);
    if( responseId ) {
      formData.append('previousResponseId', responseId);
    }
    if( Object.keys(fileActions).length > 0 ) {
      formData.append('fileActionsTaken', JSON.stringify(fileActions)); 
    }

    chat(formData)
    .then((resp: ChatResponse) => {
      setResponseId(resp.lastResponseId);

      const newConversation: Conversation = {
        request: userQuery,
        response: resp
      }

      setConversation([...conversation, newConversation]);
      setChatIndex(conversation.length); // +1 for new entry but -1 for 0 index.
    })
    .catch(error => {
      setError("Error submitting chat request");
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  function loadChatByProjectName(projectName: string) {
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
  }

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
    loadChatByProjectName
  }
}