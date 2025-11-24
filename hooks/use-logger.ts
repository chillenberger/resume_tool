
import { useRef, useContext } from "react";
import logger from "@/services/logger-service";
import { ChatSessionContext } from '@/components/session';

export default function useLogger() {
  const {sessionValue: session, updateSession} = useContext(ChatSessionContext);
  // const sessionRef = useRef<string>(sessionId);

  function newSession() {
    updateSession();
  }

  async function log(action: string, detail: string) {
    await logger(action, detail, session ? session : 'no_session');
  }

  async function removedDirLog(path: string) {
    await logger('Removed Directory', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function addedDirLog(path: string) {
    await logger('Added Directory', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function editedFileLog(path: string) {
    await logger('Edited File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function createdFileLog(path: string) {
    await logger('Created File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function deletedFileLog(path: string) {
    await logger('Deleted File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  async function switchedActiveFileLog(path: string) {
    await logger('Switched Active File', `{"path": "${path}"}`, session ? session : 'no_session');
  }

  return {
    log,
    removedDirLog,
    addedDirLog,
    editedFileLog,
    createdFileLog,
    deletedFileLog,
    switchedActiveFileLog,
    newSession,
  }
}