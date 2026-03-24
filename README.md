# ResumeIQ — AI Resume Optimizer & ATS Scanner

ResumeIQ is a full-stack web application that analyzes resume relevance against a job description, estimates ATS compatibility, identifies missing keywords, rewrites resume content using AI, and exports an optimized resume as a DOCX file.

## Screenshot

![ResumeIQ UI Placeholder](./docs/screenshot-placeholder.png)

> Replace the image above with an actual screenshot after running the app.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Gemini API key

## Setup

1. Clone the repository.
2. Backend setup:
   - `cd backend`
   - `pip install -r requirements.txt`
   - Copy `.env.example` to `.env`
   - Add your Gemini API key in `.env`
3. Frontend setup:
   - `cd ../frontend`
   - `npm install`

## Running the Application

### Backend

From the `backend/` directory:

```bash
uvicorn main:app --reload
```

### Frontend

From the `frontend/` directory:

```bash
npm run dev
```

## API Endpoints

| Method | Endpoint    | Description |
|--------|-------------|-------------|
| GET    | `/health`   | Health check endpoint returning app status |
| POST   | `/analyze`  | Upload resume file + job description, then return ATS score, keyword match, and optimized resume |
| POST   | `/download` | Convert optimized resume text into DOCX and return as downloadable file |
| POST   | `/auth/register` | Create account and return bearer token |
| POST   | `/auth/login` | Login and return bearer token |
| GET    | `/history` | Get authenticated user analysis history |
| POST   | `/cover-letter` | Generate optional cover letter |

## GitHub Pages Deployment (Frontend)

This repo is configured to run in static-only mode on GitHub Pages by default.

In static-only mode:

1. Frontend runs fully on GitHub Pages.
2. Resume parsing (PDF/DOCX/TXT), ATS scoring, optimization, and DOCX export run in the browser.
3. Auth/history/cover-letter backend endpoints are disabled.

If you later want full backend features, set a backend URL and redeploy.

1. In repo Settings -> Pages, set Source to `GitHub Actions`.
2. Push to `main`.
3. Workflow `.github/workflows/deploy-pages.yml` auto-deploys static frontend.
4. Site URL: `https://<github-username>.github.io/ResumeIQ/`.

### Optional: Enable Backend Mode Later

If you want backend endpoints (auth/history/cover-letter), set this variable and redeploy frontend:

- `VITE_API_BASE_URL=https://your-backend-service.example.com`

## Tech Stack

- Backend: FastAPI, Uvicorn
- Frontend: React 18, Vite, plain CSS
- AI: Gemini via google-generativeai SDK
- Parsing: pdfplumber (PDF), python-docx (DOCX)
- Document Export: python-docx
- Environment Management: python-dotenv
- CORS: FastAPI CORSMiddleware
