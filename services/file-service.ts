'use server'

import { writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { Doc } from '../types';
import { readFile, readdir } from 'fs';
import exec from 'child_process';

async function getFiles(folder: string): Promise<Doc[]> {
  return new Promise((resolve, reject) => {
    readdir(path.join(process.cwd(), 'public', folder), (err, files) => {
      if (err) {
        console.error(`Error reading ${folder} directory:`, err);
        return reject(err);
      }

      // Filter out system files and hidden files
      const validFiles = files.filter(file => 
        !file.startsWith('.') && 
        !file.startsWith('~') &&
        file.length > 0
      );

      const docs: Doc[] = [];

      // Create promises for reading each file
      const fileReadPromises = validFiles.map(file => {
        return new Promise<void>((fileResolve, fileReject) => {
          const fullPath = path.join(process.cwd(), 'public', folder, file);

          readFile(fullPath, (err, data) => {
            if (err) {
              console.error(`Error reading file ${fullPath}:`, err);
              fileReject(err);
            } else {
              docs.push({ title: file, content: data.toString() });
              fileResolve();
            }
          });
        });
      });

      // Wait for all files to be read before resolving
      Promise.all(fileReadPromises)
        .then(() => {
          resolve(docs);
        })
        .catch(reject);
    });
  })
}

async function syncServerToFiles(files: Doc[], folder: string) {
  const serverFiles = await getFiles(folder);
  for ( const serverFile of serverFiles ) {
    const file = files.find(f => f.title === serverFile.title);
    if ( !file ) {
      await deleteFile(serverFile.title, folder);
    }
  }

  for ( const file of files ) {
    await updateFile(file, folder);
  }
}

async function updateFile(doc: Doc, folder: string) {
  const filePath = path.join(process.cwd(), 'public', folder, doc.title);
  try {
    writeFileSync(filePath, doc.content, { flag: 'w' });
    console.log(`Successfully updated ${doc.title}`);
  } catch (error) {
    console.error(`Error updating file ${doc.title} in ${filePath}:`, error);
  }
}

async function deleteFile(title: string, folder: string) {
  const filePath = path.join(process.cwd(), 'public', folder, title);
  try {
    unlinkSync(filePath);
    console.log(`Successfully deleted ${title}`);
  } catch (error) {
    console.error(`Error deleting file ${title} in ${filePath}:`, error);
  }
}

async function exportHtmlToPdf(formData: FormData) {
  const doc = formData.get('doc') as string;
  let docName = formData.get('docName') as string || `document`;
  
  if ( !doc || !docName ) {
    console.error('No HTML content provided');
    return;
  }

  docName = docName.split('.')[0];

  const timeStamp = Date.now();
  const outputFilePath = path.join(process.cwd(), 'public', 'outputs', `${docName}.pdf`);
  const tempFilePath = path.join(process.cwd(), 'public', 'temp', `${docName}_${timeStamp}.html`);

  const command = `html2pdf ${tempFilePath} --background --output ${outputFilePath}`;
  writeFileSync(tempFilePath, doc);

  exec.exec(command, (error, stdout, stderr) => {

    unlinkSync(tempFilePath);
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    console.log(`Command output: ${stdout}`);
  });
}

export { syncServerToFiles, getFiles, exportHtmlToPdf, deleteFile };