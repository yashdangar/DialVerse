# DialVerse

A modern **Call Management System** built for businesses to make, receive, record, and analyze phone calls — all from the browser. Powered by Twilio for voice, OpenAI for transcription, and AWS S3 for recording storage.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-4-lightgrey?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Twilio](https://img.shields.io/badge/Twilio-Voice-F22F46?logo=twilio)
![OpenAI](https://img.shields.io/badge/OpenAI-Whisper-412991?logo=openai)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)

---

## Features

- **Web Dialer** — Make outbound calls directly from the browser using a 12-key numeric pad with real-time call status and duration tracking.
- **Inbound Call Handling** — Receive calls on your Twilio number with automatic forwarding to a configured redirect number.
- **Call Recording** — All calls are automatically recorded in dual-channel format and stored in AWS S3.
- **AI Transcription** — Recordings are transcribed using OpenAI's Whisper model for searchable, readable text.
- **Call Analysis** — Define custom questions and let AI extract answers from transcriptions for structured call insights.
- **Phone Number Management** — Track all phone numbers with call counts, last-called dates, and active/inactive status.
- **Call History** — Browse detailed call logs per number with playback, download, transcription, and analysis.
- **Redirect Settings** — Configure call forwarding numbers with E.164 format validation.
- **Dark/Light Mode** — Full theme support across the UI.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15 (React 19), Tailwind CSS, Radix UI, shadcn/ui, Twilio Voice SDK, Recharts, React Hook Form, Zod |
| **Backend** | Node.js, Express.js, Prisma ORM, Helmet.js, Rate Limiting, CORS |
| **Database** | PostgreSQL |
| **Voice** | Twilio (Voice SDK, TwiML, Webhooks) |
| **AI** | OpenAI Whisper (speech-to-text) |
| **Storage** | AWS S3 |
| **Deployment** | Vercel (frontend + backend) |

---

## Project Structure

```
├── backend/
│   ├── server.js              # Express server entry point
│   ├── routes/
│   │   ├── call.js            # Call management API routes
│   │   └── questions.js       # Question template API routes
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── recordings/            # Temporary recording files
│   └── vercel.json            # Vercel deployment config
│
├── frontend/
│   ├── app/
│   │   ├── page.jsx           # Landing page
│   │   ├── dialer/            # Web dialer interface
│   │   ├── numbers/           # Phone number management
│   │   ├── calls/[id]/        # Call details & transcriptions
│   │   ├── questions/         # Question template management
│   │   └── redirect-settings/ # Call forwarding config
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   └── config.js              # API URL configuration
│
└── README.md
```

---

## Database Schema

```
PhoneNumber ──< Call ──○ Recording ──○ Transcription ──< Answer
                                                    └──< Question
```

| Model | Description |
|-------|-------------|
| **PhoneNumber** | Tracked phone numbers with status, call count, last-called date |
| **Call** | Individual call records with direction, status, duration, timestamps |
| **Recording** | Call recordings stored in S3 with file URL and metadata |
| **Transcription** | AI-generated text from recordings with processing status |
| **Question** | Reorderable analysis question templates |
| **Answer** | AI-extracted answers linked to questions and transcriptions |
| **Redirect** | Call forwarding number configuration |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Twilio account (Account SID, Auth Token, Phone Number)
- OpenAI API key
- AWS S3 bucket (with credentials)

### 1. Clone the repository

```bash
git clone https://github.com/yashdangar/DialVerse.git
cd DialVerse
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Call Forwarding (default)
FORWARD_TO_NUMBER=+1234567890

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# OpenAI
OPENAI_API_KEY=sk-your-key
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start the backend server:

```bash
npm run dev
```

The backend runs on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
pnpm install
```

Update `config.js` with your backend URL if needed (defaults to `http://localhost:5000`).

Start the development server:

```bash
pnpm dev
```

The frontend runs on `http://localhost:3000`.

---

## API Endpoints

### Calls

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/call` | Initiate an outbound call |
| POST | `/api/call/handle-call` | Handle answered calls (TwiML) |
| POST | `/api/call/recording-callback` | Twilio recording webhook |
| GET | `/api/call/get-recording/:sid` | Fetch recording metadata |

### Phone Numbers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/phone-numbers` | List all tracked numbers |
| GET | `/api/phone-numbers/:id/calls` | Get calls for a number |
| PATCH | `/api/phone-numbers/:id/status` | Update number status |

### Questions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | List all questions |
| POST | `/api/questions` | Create a new question |
| DELETE | `/api/questions/:id` | Delete a question |
| POST | `/api/questions/:id/move` | Reorder a question |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/redirect-number` | Get redirect number |
| POST | `/api/redirect-number` | Set redirect number |

### Webhooks (Twilio)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/inbound` | Inbound call handler |
| POST | `/recording-status` | Recording completion callback |
| POST | `/call-status` | Call status updates |

---

## Deployment

Both frontend and backend are configured for **Vercel** deployment.

**Backend:** Uses `@vercel/node` adapter with Prisma code generation on build. CORS headers and route configuration are defined in `vercel.json`.

**Frontend:** Standard Next.js deployment on Vercel. Update `config.js` to point to your deployed backend URL.

---
