
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

function getDirFile(fullPath: string, rootDir: Dir): Doc {
  let splitPath = fullPath.split("/");
  const fileName = splitPath.pop();
  if ( !fileName ) {
    throw new Error("Invalid file name");
  }
  const dir = findDir(splitPath.join("/"), rootDir);
  if ( !dir ) {
    throw new Error(`Directory ${splitPath.join("/")} not found`);
  }

  const file = dir.children.find(c => c.title === fileName && 'content' in c) as Doc | undefined;
  if ( !file ) {
    throw new Error(`File ${fileName} not found in directory ${splitPath.join("/")}`);
  }
  return file;
}

function addFileToDir(path: string, currentDir: Dir, doc: Doc) {
  let splitPath = path.split("/");
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