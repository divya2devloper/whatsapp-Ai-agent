# WhatsApp AI Real Estate Agent

An end-to-end WhatsApp AI agent for real estate lead management, built with **Node.js + Express** (backend), **React + Vite + Tailwind CSS** (admin dashboard), and **Supabase** (cloud database).

---

## Features

| Feature | Description |
|---|---|
| 💬 WhatsApp AI Chat | Gemini-powered conversational agent with RAG (Retrieval Augmented Generation) |
| 🧠 AI Training | Custom dashboard to train your agent with your own rules, Q&A, and documents (PDF/TXT) |
| 🏘️ Property Search | AI detects intent and matches listings from your Supabase database |
| 📅 Appointment Booking | Automated scheduling on **Google Calendar** with Gmail confirmations |
| 📊 Admin Dashboard | Premium React dashboard with real-time lead tracking and skeleton loading |
| 🗄️ Supabase DB | Cloud-hosted PostgreSQL with vector search (pgvector) for AI knowledge |

---

## Project Structure

```
whatsapp-Ai-agent/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── server.js         # Entry point
│   │   ├── db/
│   │   │   └── supabaseClient.js # Supabase configuration
│   │   ├── routes/
│   │   │   ├── webhook.js    # Inbound WhatsApp webhook
│   │   │   ├── training.js   # AI training endpoints (RAG/QA)
│   │   │   └── ...           # Leads, Properties, Appointments
│   │   └── services/
│   │       ├── ai.js         # Gemini + RAG + Intent parsing
│   │       ├── whatsapp.js   # WhatsApp Meta API service
│   │       └── google.js     # Google Calendar + Gmail
│   ├── package.json
│   └── supabase_schema.sql   # Database schema & migrations
├── frontend/                 # React admin dashboard
│   ├── src/
│   │   ├── components/       # Premium UI components & Skeletons
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── AITraining.jsx # New training interface
│   │       └── ...
│   └── package.json
├── workflow/
│   └── whatsapp_real_estate_agent.json  # n8n workflow (optional)
└── .env.example
```

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Twilio account** with WhatsApp enabled (sandbox or approved number)
- **Google Gemini API key**
- **Google Cloud project** with Calendar + Gmail APIs enabled
- **Supabase Account** (Free tier works perfectly)

### 1. Clone & Configure

```bash
git clone https://github.com/divya2devloper/whatsapp-Ai-agent.git
cd whatsapp-Ai-agent
cp .env.example .env
# Edit .env and fill in your credentials (including Supabase URL & Key)
```

### 2. Database Setup

1. Create a new project in [Supabase](https://supabase.com/).
2. Copy the contents of `backend/supabase_schema.sql`.
3. Go to the **SQL Editor** in your Supabase dashboard and run the script.
4. Copy your **Project URL** and **service_role** key to your `.env` file.

### 3. Install & Start

From the root directory, run:

```bash
npm run install:all
npm start
```

This single command will:
1.  **Verify Supabase** connection and tables.
2.  **Start Backend** on `http://localhost:3001`.
3.  **Start Frontend** (Dashboard) on `http://localhost:5173`.

### 🔄 Keeping in Sync
To pull latest changes and update dependencies in one command:
```bash
npm run pull:all
```

---

## 🍎 Mac Setup Guide (Full Instructions)

Follow these steps if you are setting up the project on **macOS** for the first time.

### Step 1 — Install Prerequisites

**Install Homebrew** (Mac's package manager):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Install Node.js 18+:**
```bash
brew install node
```

Verify it's installed:
```bash
node -v   # Should show v18.x.x or higher
npm -v
```

**Install Git** (if not already installed):
```bash
brew install git
```

---

### Step 2 — Clone the Repository

```bash
git clone https://github.com/divya2devloper/whatsapp-Ai-agent.git
cd whatsapp-Ai-agent
git checkout master
```

---

### Step 3 — Configure Environment Variables

Copy the example env file and fill in your credentials:
```bash
cp .env.example .env
open -e .env   # Opens in TextEdit, or use: nano .env
```

Fill in the required values in `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_CALENDAR_ID=your-email@gmail.com
GMAIL_SENDER=your-email@gmail.com
AGENT_NAME=Priya
REAL_ESTATE_COMPANY_NAME=YourRealty
```

---

## 🧠 AI Training & Knowledge Base (RAG)

The agent uses **Google Gemini** enhanced with **Retrieval Augmented Generation (RAG)**. You can train it without code:

1.  **Persona & Rules**: Define exactly how the agent should speak (e.g., "Always be formal," "Never mention price first").
2.  **Custom Q&A**: Add specific question/answer pairs that the AI must follow exactly.
3.  **Document Upload**: Upload PDF brochures or text price lists. The system automatically converts them into vector embeddings in Supabase, allowing the AI to "search" your documents for answers.

---

### Step 4 — Supabase Database Setup

1. Create a free account at [supabase.com](https://supabase.com/) and create a new project.
2. Go to **Project Settings → API** and copy:
   - **Project URL** → paste as `SUPABASE_URL` in `.env`
   - **service_role** secret key → paste as `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. In your Supabase dashboard, go to **SQL Editor**.
4. Open the file `backend/supabase_schema.sql` from this project and paste + run it in the SQL Editor.
5. All required tables (`leads`, `conversations`, `properties`, `appointments`, `settings`) will be created.

---

### Step 5 — Install Dependencies

From the project root directory:
```bash
npm run install:all
```

---

### Step 6 — Verify Supabase Connection

```bash
npm run db:test
```

Expected output:
```
✅ Table "leads": Connected (OK)
✅ Table "conversations": Connected (OK)
✅ Table "properties": Connected (OK)
✅ Table "appointments": Connected (OK)
✅ Table "settings": Connected (OK)
```

---

### Step 7 — Start Everything

```bash
npm start
```

This will automatically:
1. ✅ Verify Supabase connection
2. 🚀 Start **Backend** on `http://localhost:3001`
3. 🖥️ Start **Frontend** (Admin Dashboard) on `http://localhost:5173`

Open your browser at **http://localhost:5173** to see the dashboard.

---

### 🔄 Updating (Pull Latest Changes)

```bash
npm run pull:all
```

This pulls the latest code from Git **and** reinstalls any new dependencies automatically.

---

### 🛠️ Troubleshooting (Mac)

| Problem | Fix |
|---|---|
| `node: command not found` | Run `brew install node` |
| `npm: command not found` | Restart terminal after installing Node |
| `Permission denied` on npm install | Run `sudo chown -R $USER ~/.npm` |
| Port 3001 already in use | Run `lsof -ti:3001` then `kill -9 <PID>` |
| Port 5173 already in use | Run `lsof -ti:5173` then `kill -9 <PID>` |
| Supabase connection fails | Double-check `.env` values match your Supabase project settings |

---

## Google OAuth2 Setup (Calendar + Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project
2. Enable **Google Calendar API** and **Gmail API**
3. Create **OAuth 2.0 credentials** (Desktop app type)
4. Download `credentials.json` and follow the instructions in the dashboard to generate your `GOOGLE_REFRESH_TOKEN`.

---

## API Reference

### Webhook
| Method | Path | Description |
|---|---|---|
| POST | `/webhook/whatsapp` | Receives inbound WhatsApp messages from Twilio |

### Admin API
- Leads: `/api/leads`
- Properties: `/api/properties`
- Appointments: `/api/appointments`
- Stats: `/api/stats`

---

## Environment Variables Reference

See `.env.example` for the full list. Required variables:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service_role API key |
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio auth token |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `AGENT_NAME` | ✅ | AI agent display name |
| `REAL_ESTATE_COMPANY_NAME` | ✅ | Company name |
