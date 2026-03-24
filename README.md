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

GitHub Pages can host the frontend only. Backend must run on a real server (for example Render).

1. Keep backend live on a public URL (example `https://your-backend.onrender.com`).
2. In your GitHub repo, open Settings -> Secrets and variables -> Actions -> Variables.
3. Add variable `VITE_API_BASE_URL` with your backend URL.
4. In repo Settings -> Pages, set Source to `GitHub Actions`.
5. Push to `main`. Workflow `.github/workflows/deploy-pages.yml` will auto-deploy frontend.
6. Frontend will be served at `https://<github-username>.github.io/ResumeIQ/`.

### Important Backend Env for Pages CORS

Set this on backend host:

- `ALLOWED_ORIGINS=https://<github-username>.github.io`

## Tech Stack

- Backend: FastAPI, Uvicorn
- Frontend: React 18, Vite, plain CSS
- AI: Gemini via google-generativeai SDK
- Parsing: pdfplumber (PDF), python-docx (DOCX)
- Document Export: python-docx
- Environment Management: python-dotenv
- CORS: FastAPI CORSMiddleware
