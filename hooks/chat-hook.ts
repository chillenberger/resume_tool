import { chat, getChatLog } from '../services/chat-service';
import { ChatResponse, Conversation } from '../types';
import { useState } from 'react';
import { File } from '../types';

export default function useChat() {
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIndex, setChatIndex] = useState<number>(0);

  function chatRequest(userQuery: string, projectName: string, files?: File[]) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('userQuery', userQuery)
    formData.append('projectName', projectName);
    if( responseId ) {
      formData.append('previousResponseId', responseId);
    }
    if( files ) {
      formData.append('doc', JSON.stringify(files)); 
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