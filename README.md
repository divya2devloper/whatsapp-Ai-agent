# WhatsApp AI Real Estate Agent

An end-to-end WhatsApp AI agent for real estate lead management, built with **Node.js + Express** (backend), **React + Vite + Tailwind CSS** (admin dashboard), and **Supabase** (cloud database).

---

## Features

| Feature | Description |
|---|---|
| 💬 WhatsApp AI Chat | OpenAI-powered conversational agent answers property inquiries 24/7 |
| 🏘️ Property Search | AI detects location intent and sends a matching listing link from your database |
| 📅 Appointment Booking | Collects lead details and books property visits on **Google Calendar** |
| 📧 Email Confirmation | Sends an HTML confirmation email via **Gmail OAuth2** |
| 👩‍💼 Admin Dashboard | React dashboard to manage leads, conversations, properties and appointments |
| 🗄️ Supabase DB | Cloud-hosted PostgreSQL database with real-time capabilities |

---

## Project Structure

```
whatsapp-Ai-agent/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── server.js         # Entry point
│   │   ├── db/
│   │   │   ├── supabaseClient.js # Supabase configuration
│   │   │   └── testConnection.js # Connectivity test utility
│   │   ├── routes/
│   │   │   ├── webhook.js    # POST /webhook/whatsapp (Twilio)
│   │   │   ├── leads.js      # /api/leads
│   │   │   ├── properties.js # /api/properties
│   │   │   ├── appointments.js # /api/appointments
│   │   │   ├── stats.js      # /api/stats
│   │   │   └── settings.js   # /api/settings
│   │   └── services/
│   │       ├── ai.js         # OpenAI conversation + intent parsing
│   │       ├── twilio.js     # WhatsApp message sender
│   │       └── google.js     # Google Calendar + Gmail
│   ├── package.json
│   └── supabase_schema.sql   # SQL for initializing database
├── frontend/                 # React admin dashboard
│   ├── src/
│   │   ├── App.jsx           # Router
│   │   ├── api/client.js     # Axios API client
│   │   ├── components/       # Layout, Badge, StatsCard
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Leads.jsx
│   │       ├── LeadDetail.jsx
│   │       ├── Properties.jsx
│   │       ├── Appointments.jsx
│   │       └── Settings.jsx
│   └── package.json
├── workflow/
│   └── whatsapp_real_estate_agent.json  # n8n workflow (optional)
├── docs/workflow-overview.md
└── .env.example
```

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Twilio account** with WhatsApp enabled (sandbox or approved number)
- **OpenAI API key**
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
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o
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
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `AGENT_NAME` | ✅ | AI agent display name |
| `REAL_ESTATE_COMPANY_NAME` | ✅ | Company name |
