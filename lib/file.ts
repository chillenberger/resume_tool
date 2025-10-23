
import { Dir, Doc, File } from '../types';

function flattenDir(item: Dir | Doc, path: string[] = [], files: File[] = []): File[] {
  if( 'content' in item ) {
    files.push({path: [...path, item.title].join('/'), content: item.content as string})
  } else if ( 'children' in item) {
    path = [...path, item.title];
    for( const child of item.children) {
      const newFiles: File[] = flattenDir(child, path, files)
      files = newFiles;
    }
  }

  return files
}

function expandDir(db: File[]): Dir {
    const firstPath = db[0].path.split("/");
    const rootTitle = firstPath[0];
    if (!rootTitle) throw new Error("Invalid root directory");
    const rootDir: Dir = { title: rootTitle, children: [] };
    const currentDir = rootDir;
  
    for( const item of db) {
      let dir = findDir(item.path, currentDir);
      let path: string[] = item.path.split("/");
      path.shift(); // remove root

      const title: string = path.pop() || "failed";
      const content = item.content
      if ( !dir ) {
        addFileToDir(path.join("/"), currentDir, { title, content: content });
      } else {
        dir.children.push({ title, content });
      }
    }
    return rootDir;
}

// Go down the tree to find the directory at the given path
function findDir(path: string, dir: Dir): Dir | null {
  if (path === "") {
    return dir;
  }

  let splitPath = path.split("/");
  let subPath = splitPath.shift();

  if (!subPath) {
    return dir;
  }

  let nextItem = dir.children.find((item) => item.title === subPath);

  if (!nextItem || !('children' in nextItem)) {
    return null;
  }

  return findDir(splitPath.join("/"), nextItem as Dir);
}

// Return the actual doc object from the give directory. 
function getDirFile(fullPath: string, rootDir: Dir): Doc | null {
  let splitPath = fullPath.split("/");
  const fileName = splitPath.pop();
  if ( !fileName ) {
    return null
  }
  const dir = findDir(splitPath.join("/"), rootDir);
  if ( !dir ) {
    return null;
  }

  const file = dir.children.find(c => c.title === fileName && 'content' in c) as Doc | undefined;
  if ( !file ) {
    return null;
  }
  return file;
}

function addFileToDir(path: string, currentDir: Dir, doc: Doc) {
  let splitPath = path.split("/").filter(part => part !== "");
  let subPath = splitPath.shift();

  if( !subPath ) {
    currentDir.children.push(doc);
    return
  };

  let nextItem = currentDir.children.find((item) => item.title == subPath);

  if ( !nextItem ) {
    const newDir: Dir = { title: subPath, children: [] };
    currentDir.children.push(newDir);
    nextItem = newDir;
  }

  if ( 'children' in nextItem ) {
    addFileToDir(splitPath.join("/"), nextItem, doc);
  } else {
    throw new Error(`Path ${path} not found, ${subPath} is a file`);
  }

  return currentDir;
}

export{ flattenDir, expandDir, findDir, getDirFile, addFileToDir }