import { chat, ChatConversationResponse, generateResume } from '../services/chat-service';
import { useState } from 'react';
import { Doc } from '../types';

interface Conversation {
  request: string;
  response: ChatConversationResponse;
}

export default function useChat() {
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIndex, setChatIndex] = useState<number>(0);

  function generateResumeRequest() {
    setIsLoading(true);
    const userRequest = "Please create a resume with the provided data.";

    generateResume(userRequest).then(resp => {
      const newConversation: Conversation = {
        request: userRequest,
        response: resp
      };

      setConversation([...conversation, newConversation]);
      setResponseId(resp.lastResponseId || null);
      
    }).catch(error => {
      setError("Error generating resume");
    }).finally(() => { setIsLoading(false); });
  }

  function chatRequest(userQuery: string, file?: Doc ) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('userQuery', userQuery)
    if( responseId ) {
      formData.append('previousResponseId', responseId);
    }
    if( file ) {
      formData.append('doc', JSON.stringify(file));
    }

    chat(formData)
    .then((resp: ChatConversationResponse) => {
      setResponseId(resp.lastResponseId);

      const newConversation: Conversation = {
        request: userQuery,
        response: resp
      }

      setConversation([...conversation, newConversation]);
      setChatIndex(conversation.length); // +1 for new entry but -1 for 0 index.
    })
    .catch(error => {
      console.error("Error in chat submission:", error);
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
    generateResumeRequest,
    chatRequest
  }
}