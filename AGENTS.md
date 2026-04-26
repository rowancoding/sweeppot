<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
SEO — always apply:

Every page must have a unique <title> and <meta name="description">
Use semantic HTML — <h1> once per page, proper heading hierarchy
Images must have descriptive alt text
URLs must be clean and descriptive
Core Web Vitals — avoid layout shift, lazy load images below the fold
Landing page copy should naturally include keywords: "football sweepstake", "sweepstake pool", "online sweepstake"
robots.txt and sitemap.xml must exist and be accurate
No noindex tags on public pages

# Code Quality Standards

No hardcoded strings, URLs, or config values — all must come from environment variables or constants files
No duplicated logic — shared utilities go in lib/
All new functions need a one-line comment explaining their purpose
No dead code — remove anything unused before committing
No manual deployment steps — everything must deploy automatically via Vercel
