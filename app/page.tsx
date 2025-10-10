'use client'
import { useState, useEffect, useRef } from 'react';
import UploadContext from '../components/upload-context';
import ChatWindow from '../components/chat';
import { Doc } from '../types';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from "rehype-sanitize";
import WaterAscii from '../components/water-ascii';

type Tab = 'context' | 'chat';

export default function Home() {
  const [tab, setTab] = useState<Tab>('context');
  const [viewedDoc, setViewedDoc] = useState<Doc | null>(null);
  const [docUpdated, setDocUpdated] = useState<boolean>(false);
  const [waterSize, setWaterSize] = useState<{rows: number, cols: number}>({rows: 0, cols: 0});
  const waterContainerRef = useRef<HTMLDivElement>(null);

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
        <h1 className="mb-2">{tab === 'context' ? 'Context Docs' : 'Chat'}</h1>
        <div className="p-2 bg-view-area rounded-md border border-neutral-50/20 me-8 h-[90vh]">
          {tab === 'context' && <UploadContext setActiveDoc={setViewedDoc} activeDoc={viewedDoc} onComplete={() => setTab('chat')} />}
          {tab === 'chat' && <ChatWindow setActiveDoc={setViewedDoc} activeDoc={viewedDoc} activeDocUpdated={docUpdated} setActiveDocUpdated={setDocUpdated} />}
        </div>
      </div>
      <div className="w-full">
        <div className="w-full z-0 flex flex-col">
          <h1 className="mb-2">{tab.toUpperCase()} - {viewedDoc ? viewedDoc.title : 'Select File / Loading...'}</h1>
          { viewedDoc && 
          <>
            <MDEditor 
              value={viewedDoc.content}
              height="90vh"
              visibleDragbar={false}
              onChange={(val) => {
                setViewedDoc({ ...viewedDoc, content: val || '' });
                setDocUpdated(true);
              }}
              previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
            />
          </>
          }
          {
            !viewedDoc && <div className="h-[90vh]" ref={waterContainerRef}><WaterAscii rows={waterSize.rows} cols={waterSize.cols} /></div>
          }
        </div>
      </div>
    </div>
  );
}
