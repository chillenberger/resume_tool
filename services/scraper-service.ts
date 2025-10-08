'use server'
import Firecrawl from '@mendable/firecrawl-js';

export default async function scrapeUrl(url: string) {
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