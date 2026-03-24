# ResumeIQ — AI Resume Optimizer & ATS Scanner

ResumeIQ is a full-stack web application that analyzes resume relevance against a job description, estimates ATS compatibility, identifies missing keywords, rewrites resume content using AI, and exports an optimized resume as a DOCX file.

## Screenshot

![ResumeIQ UI Placeholder](./docs/screenshot-placeholder.png)

> Replace the image above with an actual screenshot after running the app.

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

## Setup

1. Clone the repository.
2. Backend setup:
   - `cd backend`
   - `pip install -r requirements.txt`
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key in `.env`
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

## Tech Stack

- Backend: FastAPI, Uvicorn
- Frontend: React 18, Vite, plain CSS
- AI: OpenAI GPT-4o via openai Python SDK
- Parsing: pdfplumber (PDF), python-docx (DOCX)
- Document Export: python-docx
- Environment Management: python-dotenv
- CORS: FastAPI CORSMiddleware
