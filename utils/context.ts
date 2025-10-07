'use server'

import { readFile, readdir } from 'fs';
import path from 'path';
import { Doc } from '../types';

async function getDocs(): Promise<Doc[]> {
  return new Promise((resolve, reject) => {    
    readdir(path.join(process.cwd(), 'public', 'jobs'), (err, files) => {
      if (err) {
        console.error(`Error reading jobs directory:`, err);
        return reject(err);
      }

      const docs: Doc[] = [];

      // Create promises for reading each file
      const fileReadPromises = files.map(file => {
        return new Promise<void>((fileResolve, fileReject) => {
          const fullPath = path.join(process.cwd(), 'public', 'jobs', file);

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

export { getDocs };