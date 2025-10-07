'use server'

import Firecrawl from '@mendable/firecrawl-js';
import { writeFileSync } from 'fs';
import { getDocs } from '../utils/context';
import path from 'path';

async function scrapeUrl(formData: FormData) {
    const API_KEY = process.env.FIRECRAWL_API_KEY;

    const link = formData.get('url') as string;
    const title = formData.get('title') as string || `context-${Date.now()}.md`;
    if (!link) return;

    const firecrawl = new Firecrawl({
        apiKey: API_KEY || '',
    });

    const scrapeResponse = await firecrawl.scrape(link, {
        formats: ['markdown', 'html'],
    });

    if (scrapeResponse.markdown) {
        const filePath = path.join(process.cwd(), 'public', 'jobs', title);
        try {
            writeFileSync(filePath, scrapeResponse.markdown, { flag: 'w' });
            console.log(`Successfully saved ${title}`);
        } catch (error) {
            console.error(`Error saving ${title}:`, error);
        }
    }

}

async function updateDoc(formData: FormData) {
  const doc = formData.get('doc')?.toString();
  const title = formData.get('title')?.toString();

  if (!doc || !title) {
    throw new Error('Required field "doc" is missing from formData');
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