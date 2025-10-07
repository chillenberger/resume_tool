
## Overview
This app helps job seekers quickly tailor resumes, cover letters, and any other files required for the job application process.  It does this in three ways: 
- web scrape or copy paste context in the app. 
- facilitates and manages llm discussion with context. 
- in app editing of context files and generated files. 


Web scraper: Firecrawl  https://www.firecrawl.dev.
Current LLM: OpenAI.

## Vision
- Generalize this method for all writing. This can very easily work for any topic. 
- Develop enhanced methods of managing llm context in text creation.
- Parallel code editor level control over docs.
- Simplify llm discussion area. Currently most LLM integrations output the discussion in a long scrolling box, making it hard to find anything in the past discussion. 

## Getting Started
Add / update all relevant files: 
- firecrawl api key to .env / .env.local
- openai api key to .env / .env.local
- add resume template in html to public/templates
- add cover letter template in html to public/templates
- add resume_data.json to public 


First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

For html -> pdf converter you need html2pdf https://crates.io/crates/html2pdf

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
 