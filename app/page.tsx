'use client'
import { useManageFiles } from "@/hooks/use-file-manager";


export default function Home() {
  const { dir, addProject, isLoading, error } = useManageFiles('');

  const handleCreateNewProject = async () => {
    const projectName = prompt("Enter project name:");
    if (projectName) {
      addProject(projectName);
    }
  }

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2">Select / create a project</h1>
        {isLoading && <p>Loading...</p>}
        {error && <p>Error loading projects</p>}

        {dir.children.map((item, i) => (<a key={i} href={`/chat/${item.title}`}>{'children' in item && item.title}</a>))}
        <button onClick={handleCreateNewProject} className="hover:cursor-pointer">Create New Project</button>
      </div>
    </div>
  );
}
