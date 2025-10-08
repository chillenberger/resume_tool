'use client'
import { useState } from 'react';
import { scrapeUrl } from '../services/context-service';
import { Doc } from '../types';

export default function useUrlScraper() {
  const [error, setError] = useState<'URL is required' | 'Failed to scrape URL' | 'Title is required' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function urlToDoc(formData: FormData): Promise<Doc | undefined> {
    setIsLoading(true);

    const url = formData.get('url') as string;
    const title = formData.get('title') as string || `context-${Date.now()}.md`;

    if (!url) {
      setError('URL is required');
      setIsLoading(false);
      return;
    } else if (!title) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }

    try {
      let scrapedContent = await scrapeUrl(url);
      if ( !scrapedContent || !scrapedContent.markdown ) {
        throw new Error('Failed to scrape URL');
      }
      const rsp: Doc = { title, content: scrapedContent.markdown};
      return rsp;
    } catch (error) {
      setError('Failed to scrape URL');
    } finally {
      setIsLoading(false);
    }

  }

  return { urlToDoc, isLoading, error };
}