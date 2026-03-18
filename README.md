# WhatsApp AI Real Estate Agent

An end-to-end WhatsApp AI agent for real estate lead management, built with **Node.js + Express** (backend), **React + Vite + Tailwind CSS** (admin dashboard), and optionally **n8n** for no-code automation.

---

## Features

| Feature | Description |
|---|---|
| 💬 WhatsApp AI Chat | OpenAI-powered conversational agent answers property inquiries 24/7 |
| 🏘️ Property Search | AI detects location intent and sends a matching listing link from your database |
| 📅 Appointment Booking | Collects lead details and books property visits on **Google Calendar** |
| 📧 Email Confirmation | Sends an HTML confirmation email via **Gmail OAuth2** |
| 👩‍💼 Admin Dashboard | React dashboard to manage leads, conversations, properties and appointments |
| 🗄️ SQLite Database | Zero-config embedded database – no external DB needed |

---

## Project Structure

```
whatsapp-Ai-agent/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── server.js         # Entry point
│   │   ├── db/database.js    # SQLite schema + seed
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
│   └── data/                 # SQLite DB (auto-created, gitignored)
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
- **Google Cloud project** with Calendar + Gmail APIs enabled (for appointment booking)

### 1. Clone & Configure

```bash
git clone https://github.com/divya2devloper/whatsapp-Ai-agent.git
cd whatsapp-Ai-agent
cp .env.example .env
# Edit .env and fill in your credentials
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Start the Backend

```bash
cd backend
npm start          # production
# or
npm run dev        # development (auto-restarts on changes)
```

The server starts on `http://localhost:3001` (configurable via `PORT` in `.env`).

### 4. Start the Admin Dashboard

```bash
cd frontend
npm run dev        # development server at http://localhost:5173
# or
npm run build      # build for production → dist/
```

### 5. Expose the Webhook to Twilio

Twilio needs a public HTTPS URL to forward WhatsApp messages to your backend. Use [ngrok](https://ngrok.com/) during development:

```bash
ngrok http 3001
```

In your [Twilio Console](https://console.twilio.com/), set the WhatsApp **Incoming Message** webhook URL to:
```
https://<your-ngrok-id>.ngrok.io/webhook/whatsapp
```

---

## Google OAuth2 Setup (Calendar + Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project
2. Enable **Google Calendar API** and **Gmail API**
3. Create **OAuth 2.0 credentials** (Desktop app type)
4. Download `credentials.json` and run this one-time flow to get your refresh token:

```bash
node -e "
const { google } = require('googleapis');
const readline = require('readline');

const oAuth2 = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3001/auth/google/callback'
);
const authUrl = oAuth2.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send',
  ],
});
console.log('Open this URL in your browser:\n', authUrl);

const rl = readline.createInterface({ input: process.stdin });
rl.question('\nPaste the code from the redirect URL: ', async (code) => {
  const { tokens } = await oAuth2.getToken(code);
  console.log('GOOGLE_REFRESH_TOKEN=', tokens.refresh_token);
  rl.close();
});
"
```

5. Copy the `GOOGLE_REFRESH_TOKEN` value into your `.env` file

---

## API Reference

### Webhook
| Method | Path | Description |
|---|---|---|
| POST | `/webhook/whatsapp` | Receives inbound WhatsApp messages from Twilio |

### Leads
| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List all leads (`?search=`, `?status=`, `?page=`, `?limit=`) |
| GET | `/api/leads/:phone` | Lead detail + full conversation + appointments |
| PUT | `/api/leads/:phone` | Update name, email, status, notes |
| DELETE | `/api/leads/:phone` | Delete lead and all associated data |

### Properties
| Method | Path | Description |
|---|---|---|
| GET | `/api/properties` | List all properties (`?active=true`) |
| POST | `/api/properties` | Add a property listing |
| PUT | `/api/properties/:id` | Update a property |
| DELETE | `/api/properties/:id` | Delete a property |

### Appointments
| Method | Path | Description |
|---|---|---|
| GET | `/api/appointments` | List appointments (`?status=`, `?date=YYYY-MM-DD`) |
| PUT | `/api/appointments/:id` | Update status or notes |
| DELETE | `/api/appointments/:id` | Delete appointment |

### Settings / Stats
| Method | Path | Description |
|---|---|---|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/settings` | Get agent settings |
| PUT | `/api/settings` | Update agent settings |

---

## How the AI Conversation Works

1. A lead sends a WhatsApp message → Twilio forwards it to `POST /webhook/whatsapp`
2. The backend loads the last 20 messages from the SQLite DB for context
3. OpenAI GPT-4o generates a reply (with the conversation history)
4. If the AI detects a property inquiry, it emits:
   `ACTION:{"type":"property_search","location":"Bandra","property_type":"2BHK","budget":"1Cr"}`
5. The backend looks up a matching URL in the Properties table (or builds a deep-link to the base URL)
6. If the AI has collected all booking details, it emits:
   `ACTION:{"type":"book_appointment","lead_name":"...","lead_email":"...","preferred_datetime":"..."}`
7. A Google Calendar event is created and a confirmation email is sent
8. The final reply is sent back to the lead via Twilio

---

## Admin Dashboard Pages

| Page | Description |
|---|---|
| **Dashboard** | Stats cards, weekly message chart, recent leads, upcoming appointments |
| **Leads** | Searchable lead list with status, message count, and last activity |
| **Lead Detail** | Full conversation thread + lead edit form + appointments |
| **Properties** | CRUD for property listings (location, URL, type, price range) |
| **Appointments** | All booked visits with status management (confirm / complete / cancel) |
| **Settings** | Agent name, company name, OpenAI model, property website URL |

---

## n8n Workflow (Optional)

An importable n8n workflow is available at `workflow/whatsapp_real_estate_agent.json` for teams that prefer a no-code automation approach. See `docs/workflow-overview.md` for details.

---

## Environment Variables Reference

See `.env.example` for the full list. Required variables:

| Variable | Required | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | ✅ | Your Twilio WhatsApp number |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `GOOGLE_CLIENT_ID` | ⚠️ Optional | Required for Calendar/Gmail |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Optional | Required for Calendar/Gmail |
| `GOOGLE_REFRESH_TOKEN` | ⚠️ Optional | Required for Calendar/Gmail |
| `GMAIL_SENDER` | ⚠️ Optional | Gmail address for sending emails |
| `PROPERTY_WEBSITE_BASE_URL` | ✅ | Fallback URL for property listings |
| `AGENT_NAME` | ✅ | AI agent display name |
| `REAL_ESTATE_COMPANY_NAME` | ✅ | Company name used in messages |
