'use server'

import Firecrawl from '@mendable/firecrawl-js';
import { writeFileSync } from 'fs';
import { getDocs } from '../utils/context';
import path from 'path';

async function scrapeUrl(url: string) {
    const API_KEY = process.env.FIRECRAWL_API_KEY;
    if (!url) return;
    
    const firecrawl = new Firecrawl({
        apiKey: API_KEY || '',
    });

    const scrapeResponse = await firecrawl.scrape(url, {
        formats: ['markdown', 'html'],
    });

    return scrapeResponse;
}

async function updateDoc(formData: FormData) {
  const doc = formData.get('doc')?.toString();
  const title = formData.get('title')?.toString();

  if ( doc === null || doc === undefined ) {
    throw new Error('Required field "doc" is missing from formData');
  } else if (!title) {
    throw new Error('Required field "title" is missing from formData');
  }

  const filePath = path.join(process.cwd(), 'public', 'jobs', `${title}`);
  try {
    writeFileSync(filePath, doc, { flag: 'w' });
    console.log(`Successfully updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

export { scrapeUrl, getDocs, updateDoc };