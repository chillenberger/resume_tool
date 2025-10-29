'use client'
import { useState, useEffect, useRef, use } from 'react';
import ChatWindow from '@/components/chat';
import useSyncedFileSystem from '@/hooks/use-file-manager';
import WaterAscii from '@/components/water-ascii';
import FileTree from '@/components/file-tree';
import path from 'path';

import { DisplayEditor, useSimpleMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor'

import dynamic from 'next/dynamic';
import HtmlEditor from '@/components/ck-editor/ck-editor';

const DisplayCKEditor = dynamic( () => import( '@/components/ck-editor/ck-editor-display' ), { ssr: false } );

export default function ChatPage({params}: {params: Promise<{ project: string}>}) {
  const {project} = use(params);
  const [waterSize, setWaterSize] = useState<{rows: number, cols: number}>({rows: 0, cols: 0});
  const waterContainerRef = useRef<HTMLDivElement>(null);
  const {
    allFiles,
    loadFiles,
    activeFile, 
    setActiveFileContent,
    saveActiveFile,
    editedFiles,
    handleDeleteFile, 
    handleExportFile, 
    handleCreateFile, 
    clearEditedFiles, 
    handleChangeActiveFile } = useSyncedFileSystem(project);

  const markdownEditor = useSimpleMarkdownEditor();
  const htmlEditor = HtmlEditor();

  const isLoading = false;

  useEffect(() => {
    function updateWaterSize() {
      if (waterContainerRef.current) {
        const height = waterContainerRef.current.clientHeight;
        const width = waterContainerRef.current.clientWidth;
        const approxCharHeight = 15; // Approximate character height in pixels
        const approxCharWidth = 10; // Approximate character width in pixels
        const rows = Math.floor(height / approxCharHeight);
        const cols = Math.floor(width / approxCharWidth);
        setWaterSize({ rows, cols });
      }
    }

    updateWaterSize();
  }, [waterContainerRef.current]);


  function getContentTypeFromPath(filePath: string): 'html' | 'markdown' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
      return 'markdown';
    }
    return 'html';
  }

  function extractFileContent() {
    if (!activeFile) return '';
    const contentType = getContentTypeFromPath(activeFile.path);
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || '';
    } else {
      return htmlEditor.current.getData() || '';
    }
  }

  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFile?.path || '');
    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFile ? activeFile.content : '';
      markdownEditor?.commands.setContent(markdownContent);
    } else if (contentType === 'html' && htmlEditor.current) {
      const htmlContent = activeFile ? activeFile.content : '';
      htmlEditor.current.setData(htmlContent);
    }
  }, [activeFile]);

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2"><a href="/">Projects</a> / {project}</h1>
        <div className="p-2 bg-view-area rounded-md border border-neutral-50/20 me-8 h-[90vh]">
          <div className="flex flex-col gap-3 p-3 w-lg h-full">
            <FileTree dir={allFiles} onFileChange={(path) => handleChangeActiveFile(path, extractFileContent())} onFileExport={handleExportFile} onFileDelete={handleDeleteFile} onFileCreate={handleCreateFile} saveActiveFile={saveActiveFile} />
            <ChatWindow loadDir={loadFiles} project={project} saveActiveFile={saveActiveFile} editedFiles={editedFiles} clearEditedFiles={clearEditedFiles} />
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full z-0 flex flex-col">
          <h1 className="mb-2">{activeFile ? activeFile.path : 'Select File / Loading...'}</h1>
          { activeFile ? <div className="flex h-[90vh] overflow-hidden">
            { getContentTypeFromPath(activeFile.path) === 'markdown' ? <DisplayEditor editor={markdownEditor} editorType={getContentTypeFromPath(activeFile.path)} /> :  <DisplayCKEditor editorRef={htmlEditor} defaultContent={activeFile.content}/> }
          </div> : <div className="h-[90vh]" ref={waterContainerRef}><WaterAscii rows={waterSize.rows} cols={waterSize.cols} /></div> }
        </div>
      </div>
    </div>
  );
}
