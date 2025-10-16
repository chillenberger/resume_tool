'use client'
import { useManageFiles } from "@/hooks/file-manager-hook";


export default function Home() {
  const { dir, isLoading, error } = useManageFiles('projects');

  const handleFileSelect = (title: string) => {
    console.log("chose a file: ", title)
  }

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2">Select / create a project</h1>
        {isLoading && <p>Loading...</p>}
        {error && <p>Error loading projects</p>}

        {dir.children.map((item, i) => (<div key={i} onClick={() => handleFileSelect(item.title)}>{'children' in item && item.title}</div>))}
      </div>
    </div>
  );
}
