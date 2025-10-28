'use client'
import { useState, useEffect, useRef, use } from 'react';
import ChatWindow from '@/components/chat';
import useSyncedFileSystem from '@/hooks/use-file-manager';
import WaterAscii from '@/components/water-ascii';
import FileTree from '@/components/file-tree';

import { SimpleEditor } from '@/components/editor/tiptap-templates/simple/simple-editor'

export default function ChatPage({params}: {params: Promise<{ project: string}>}) {
  const {project} = use(params);
  const [waterSize, setWaterSize] = useState<{rows: number, cols: number}>({rows: 0, cols: 0});
  const waterContainerRef = useRef<HTMLDivElement>(null);
  const {
    allFiles,
    loadFiles,
    activeFile, 
    setActiveFile, 
    activeFileUpdated,
    setActiveFileUpdated, 
    editedFiles, 
    saveActiveFile, 
    handleDeleteFile, 
    handleExportFile, 
    handleCreateFile, 
    clearEditedFiles, 
    handleChangeActiveFile } = useSyncedFileSystem(project);

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

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2"><a href="/">Projects</a> / {project}</h1>
        <div className="p-2 bg-view-area rounded-md border border-neutral-50/20 me-8 h-[90vh]">
          <div className="flex flex-col gap-3 p-3 w-lg h-full">
            <FileTree dir={allFiles} onFileChange={handleChangeActiveFile} onFileExport={handleExportFile} onFileDelete={handleDeleteFile} onFileCreate={handleCreateFile} saveActiveFile={saveActiveFile} />
            <ChatWindow loadDir={loadFiles} project={project} saveActiveFile={saveActiveFile} editedFiles={editedFiles} clearEditedFiles={clearEditedFiles} />
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full z-0 flex flex-col">
          <h1 className="mb-2">{activeFile ? activeFile.path : 'Select File / Loading...'}</h1>
          { activeFile ? <div className="flex h-[90vh] overflow-auto">
            <SimpleEditor file={activeFile} updateFile={setActiveFile} setActiveDocUpdated={setActiveFileUpdated} /> 
          </div> : <div className="h-[90vh]" ref={waterContainerRef}><WaterAscii rows={waterSize.rows} cols={waterSize.cols} /></div> }
        </div>
      </div>
    </div>
  );
}
