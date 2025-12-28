# Electrical Construction Estimation App

A professional electrical construction estimation tool built with Next.js, featuring **user authentication**, **cloud persistence with MongoDB**, AI-powered pricing research, real-time calculations, and professional PDF/Excel exports.

## Features

- **User Authentication**: Secure sign-in with email magic links or Google OAuth
- **Cloud Persistence**: All data stored in MongoDB Atlas (cloud database)
- **Multi-User Support**: Each user has their own estimates and settings
- **Estimate Management**: Create, view, edit, and delete electrical estimates
- **Real-time Pricing**: Live calculation of labor + materials + markup
- **AI-Powered Pricing**: Server-side AI pricing research (OpenAI/Anthropic)
- **Professional Exports**: Generate PDF quotes and Excel spreadsheets
- **Custom Dark Theme**: Professional blue-black design
- **Data Migration**: Import existing localStorage estimates to cloud
- **Work Types**: Residential, Commercial, and Service Call categories

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier available)
- Email provider account (Resend recommended - free tier available)
- AI API keys (optional, for pricing research)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd electrical-estimates
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up MongoDB Atlas** (FREE)
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account and cluster (M0 Sandbox - 512MB free)
   - Create a database user with read/write privileges
   - Whitelist your IP address (0.0.0.0/0 for development)
   - Get your connection string from "Connect" → "Connect your application"

4. **Set up Email Provider** (for magic links)
   - **Recommended: Resend** (3000 free emails/month)
   - Sign up at [resend.com](https://resend.com)
   - Get your API key from the dashboard
   - Add your sending domain (or use their test domain for development)

5. **Configure Environment Variables**
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Edit `.env.local` and fill in your credentials:
     ```bash
     # Required
     MONGODB_URI=mongodb+srv://...       # From MongoDB Atlas
     NEXTAUTH_URL=http://localhost:3000  # Your app URL
     NEXTAUTH_SECRET=...                 # Generate with: openssl rand -base64 32
     EMAIL_SERVER_PASSWORD=...           # Your Resend API key
     EMAIL_FROM=noreply@yourdomain.com   # Your verified email

     # Optional (for AI pricing)
     OPENAI_API_KEY=sk-...              # From platform.openai.com
     ANTHROPIC_API_KEY=sk-ant-...       # From console.anthropic.com
     ```

6. **Run Development Server**
```bash
npm run dev
```

7. **Open the app**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to the sign-in page
   - Sign in with your email (check inbox for magic link)

## Setup

### First-Time Setup

1. **Sign In**: Use email magic link or Google OAuth (if configured)
2. **Configure Settings**:
   - Navigate to Settings (after signing in)
   - Enter your company information
   - Set default hourly rate and markup percentage
   - Choose preferred AI provider (OpenAI or Anthropic)
3. **Import Existing Data** (if upgrading):
   - On first sign-in, you'll be prompted to import localStorage estimates
   - This is optional and only appears once

### Generating NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to your `.env.local` as `NEXTAUTH_SECRET`

## Usage

### Creating an Estimate

1. Click **"New Estimate"** from dashboard
2. Fill in client information and project details
3. Enter scope of work and select work type
4. Add labor hours and rate
5. Add materials with quantities and costs
6. Adjust markup percentage
7. Review pricing summary
8. Save estimate

### Exporting

- **PDF**: Professional quote with company branding
- **Excel**: Detailed spreadsheet with pricing breakdown

### AI Pricing (Optional)

Enable in settings with API key. AI will research comparable pricing based on:
- Scope of work
- City/location
- Work type

Results include average price, price range, sources, and confidence level.

## Tech Stack

**Frontend:**
- Next.js 16.1 with App Router & TypeScript
- Tailwind CSS (custom dark theme)
- Zustand (client-side state management)
- React Hook Form + Zod (form validation)

**Backend & Authentication:**
- NextAuth.js v5 (authentication with email magic links & OAuth)
- MongoDB Atlas (cloud database - free tier)
- Mongoose (ODM for MongoDB)
- Next.js API Routes (serverless functions)

**AI & Export:**
- OpenAI GPT-4 / Anthropic Claude (server-side AI pricing)
- jsPDF (PDF export)
- xlsx (Excel export)

## Architecture

**Hybrid State Management:**
- Zustand stores provide optimistic UI updates
- MongoDB provides cloud persistence and multi-user support
- API routes handle authentication, authorization, and data sync

**Security:**
- All API routes protected with NextAuth middleware
- User data isolation (users can only access their own estimates)
- Server-side API keys (not exposed to client)
- Input validation with Zod schemas
- HTTPS required for production

## Security Notes

✅ **Secure Architecture**
- API keys stored server-side only (environment variables)
- User authentication required for all routes
- Data isolation per user (MongoDB user ID filtering)
- Input validation on all API endpoints
- Session-based authentication with JWT

✅ **Data Protection**
- Cloud backups via MongoDB Atlas
- Automatic timestamps on all records
- User can only access their own data
- Secure password-less auth (magic links)

## Project Structure

```
/app
  /api                  - API routes (serverless functions)
    /auth               - NextAuth authentication
    /estimates          - Estimates CRUD + sync
    /settings           - User settings
    /ai                 - AI pricing (server-side)
  /auth                 - Auth pages (sign-in)
  /estimates            - Estimate pages
  /settings             - Settings page
  page.tsx              - Dashboard
  layout.tsx            - Root layout with SessionProvider

/components
  /auth                 - Auth components (SignOutButton)
  /ui                   - Reusable UI components
  /providers            - Context providers

/lib
  /ai                   - AI pricing logic & prompts
  /db                   - Database (MongoDB connection, models)
  /export               - PDF/Excel export
  /pricing              - Pricing calculations
  /stores               - Zustand stores (with API sync)
  /validation           - Zod schemas

/types                  - TypeScript type definitions
middleware.ts           - NextAuth route protection
.env.example            - Environment variables template
```

## Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
   - Import your GitHub repo
   - Vercel auto-detects Next.js

2. **Configure Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`:
     - `MONGODB_URI`
     - `NEXTAUTH_URL` (change to your production URL)
     - `NEXTAUTH_SECRET`
     - `EMAIL_SERVER_*` variables
     - `OPENAI_API_KEY` (optional)
     - `ANTHROPIC_API_KEY` (optional)
     - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Post-Deployment**
   - Update `NEXTAUTH_URL` to your production domain
   - Configure MongoDB Atlas to whitelist Vercel IPs
   - Test authentication flow

### Manual Deployment

Build for production:
```bash
npm run build
npm start
```

Note: This app requires a Node.js server (for API routes and authentication). Cannot be deployed as static HTML.

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

For personal and commercial use.
