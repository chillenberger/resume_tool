'use client'
import { useEffect, use, useReducer, useCallback } from 'react';
import ChatWindow from '@/components/chat';
import {useManageFilesTest, useManageActiveFile} from '@/hooks/use-file-manager';
import WaterAscii from '@/components/water-ascii';
import FileTree from '@/components/file-tree';
import { getContentTypeFromPath } from '@/lib/file';
import Link from 'next/link';
import path from 'path';

import { DisplayEditor, useTipTapMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor'

import dynamic from 'next/dynamic';
import useCKHtmlEditor from '@/components/ck-editor/ck-editor';

const DisplayCKEditor = dynamic( () => import( '@/components/ck-editor/ck-editor-display' ), { ssr: false } );

export default function ChatPage() {
  const {dir, editedFiles, addFile, updateFile, deleteFile, pullFileSystem} = useManageFilesTest("/Users/danielillenberger/Documents/job_hunting_resources/resume_tool/test-utils")
  const {activeFile, update: updateActiveFile, switch_: switchActiveFile, actionDispatch: activeFileActionDispatch} = useManageActiveFile(dir, editedFiles, updateFile);


  const markdownEditor = useTipTapMarkdownEditor(() => activeFileActionDispatch('next'));
  const htmlEditor = useCKHtmlEditor(() => activeFileActionDispatch('next'));

  const isLoading = false;

  const extractFileContent = useCallback(() => {
    if (!activeFile) return '';
    const contentType = getContentTypeFromPath(activeFile.path);
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || '';
    } else {
      return htmlEditor?.editorRef.current?.getData() || '';
    }
  }, [activeFile, markdownEditor, htmlEditor]);

  // Whenever active file changes, load its content into the appropriate editor.
  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFile?.path || '');
    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFile ? activeFile.content : '';
      markdownEditor?.commands.setContent(markdownContent, {contentType: 'markdown'});
    } else if (contentType === 'html' && htmlEditor.editorRef.current) {
      const htmlContent = activeFile ? activeFile.content : '';
      htmlEditor.editorRef.current.setData(htmlContent);
    }
  }, [activeFile, markdownEditor, htmlEditor]);

  const handleSwitchActiveFile = useCallback((path: string) => {
    updateActiveFile(extractFileContent())
    switchActiveFile(path);
  }, [extractFileContent, activeFileActionDispatch]);

  const handleOnFileDelete = useCallback((path: string) => {
    updateActiveFile(extractFileContent())
    deleteFile(path);
  }, [activeFile, extractFileContent, activeFileActionDispatch, deleteFile]);

  const handleOnFileCreate = useCallback((path: string) => {
    updateActiveFile(extractFileContent())
    addFile(path, 'New file content');
  }, [extractFileContent, activeFileActionDispatch]);

  const handleOnFileExport = useCallback((filePath: string) => {
    // updateActiveFile(extractFileContent());
    // const file = getFile(filePath).file;
    // if ( !file ) return; 
    // const formData = new FormData();
    // formData.append('doc', context || file.content);
    // formData.append('docName', path.basename(file.path));

    // await exportHtmlToPdf(formData);
    // exportFile(path);
  }, [activeFile, extractFileContent, activeFileActionDispatch]);

  const handleOnChatRequest = useCallback(() => {
    updateActiveFile(extractFileContent())
    // if ( activeFile ) updateFile(activeFile.path);
  }, [extractFileContent, activeFileActionDispatch]);

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2"><Link href="/">Projects</Link> / test</h1>
        <div className="p-2 bg-view-area rounded-md border border-neutral-50/20 me-8 h-[90vh]">
          <div className="flex flex-col gap-3 p-3 w-lg h-full">
            <FileTree dir={dir} onFileChange={handleSwitchActiveFile} onFileExport={handleOnFileExport} onFileDelete={handleOnFileDelete} onFileCreate={handleOnFileCreate} />
            <ChatWindow loadDir={pullFileSystem} project="test" editedFiles={{}} clearEditedFiles={() => {}} onRequest={handleOnChatRequest}/>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full z-0 flex flex-col">
          <h1 className="mb-2">{activeFile ? activeFile.path : 'Select File / Loading...'}</h1>
          { 
            activeFile ? 
            <div className="flex h-[90vh] overflow-hidden">
              { getContentTypeFromPath(activeFile.path) === 'markdown' ? 
                <DisplayEditor editor={markdownEditor} editorType={'markdown'} /> :  
                <DisplayCKEditor editorRef={htmlEditor} defaultContent={activeFile?.content || ""}/> 
              }
            </div> :
            <WaterAscii className="h-[90vh]"/>
          }
        </div>
      </div>
    </div>
  );
}
