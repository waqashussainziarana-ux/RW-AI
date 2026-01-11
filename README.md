
# LinkedIn AI Sales Agent - Web Dev & SEO Agency

Production-ready agent for intelligent lead outreach using Gemini AI (Flash for audits, Pro for sales messaging).

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind
- **AI Engine**: Gemini 3 Flash (Audits) & Gemini 3 Pro (Sales)
- **Database**: Vercel Postgres (via SQL provided in `db/schema.sql`)
- **API Runtime**: Vercel Serverless Functions

## Deployment Instructions

### 1. Database Setup
1. Create a [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) database.
2. Run the provided SQL in `db/schema.sql` within the Vercel Postgres Dashboard query editor.

### 2. Environment Variables
Ensure you have the following keys in your Vercel project environment settings:
- `API_KEY`: Your Google Gemini API Key.
- `POSTGRES_URL`: Provided by Vercel Postgres automatically.

### 3. Build & Deploy
- Standard Next.js / React deployment on Vercel.
- API endpoints map to the `app/api/` structure as defined in the project blueprint.

## Sales Logic
- **Consultative Approach**: Instead of asking for money, the AI identifies a real business pain point (e.g., slow mobile site) and offers a free audit.
- **Tone Control**: The system detects the lead's country and adapts the tone between US (results-oriented), UK (indirect/consultative), and EU (formal/value-driven).
- **Approval-First**: No messages are sent automatically. Every message is drafted by Gemini Pro, then presented for human approval and manual sending via LinkedIn.
