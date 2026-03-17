# WhatsApp AI Real Estate Agent

An **n8n**-powered WhatsApp AI agent that handles real estate leads end-to-end:

- Receives inbound WhatsApp messages via **Twilio**
- Uses **OpenAI GPT-4o** to understand user intent
- Sends **property listing links** filtered by location, type, and budget
- Books **property visit appointments** on **Google Calendar** and sends **Gmail** confirmation emails
- Responds back to the lead on WhatsApp automatically

---

## Workflow Diagram

```
WhatsApp Lead
     │  (Twilio webhook)
     ▼
n8n Webhook ──► Parse Message ──► AI Agent (GPT-4o)
                                         │
                     ┌───────────────────┼───────────────────┐
                     ▼                   ▼                   ▼
              Property Search     Book Appointment      Plain Reply
                     │                   │
             Build Listing URL    Google Calendar
                     │               + Gmail
                     └─────────┬─────────┘
                               ▼
                     Send WhatsApp Reply
                        (Twilio API)
```

For a detailed node-by-node explanation see [`docs/workflow-overview.md`](docs/workflow-overview.md).

---

## Prerequisites

| Service | Purpose |
|---|---|
| [n8n](https://n8n.io) (≥ 1.30) | Workflow automation engine |
| [Twilio](https://twilio.com) | WhatsApp Business API / Sandbox |
| [OpenAI](https://platform.openai.com) | AI language model (GPT-4o) |
| [Google Cloud](https://console.cloud.google.com) | Calendar & Gmail OAuth2 |
| Your property listing website | Generates filtered search URLs |

---

## Quick Start

### 1. Clone & configure environment

```bash
git clone https://github.com/divya2devloper/whatsapp-Ai-agent.git
cd whatsapp-Ai-agent
cp .env.example .env
# Edit .env and fill in all credentials
```

### 2. Start n8n

```bash
# Docker (recommended)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  --env-file .env \
  n8nio/n8n

# Or npm
npm install -g n8n
n8n start
```

### 3. Import the workflow

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows → Import from file**
3. Select `workflow/whatsapp_real_estate_agent.json`
4. Click **Save** and then **Activate**

### 4. Configure credentials in n8n

Navigate to **Settings → Credentials** and create:

| Credential name | Type | Notes |
|---|---|---|
| `OpenAI account` | OpenAI API | Paste your `OPENAI_API_KEY` |
| `Google Calendar account` | Google Calendar OAuth2 | Authorise with your Google account |
| `Gmail account` | Gmail OAuth2 | Same Google account or a dedicated sender |

> **Note:** Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) are read from environment variables inside the Code node, so no n8n credential object is required for Twilio.

### 5. Connect Twilio to n8n

1. Activate the workflow in n8n
2. Copy the **Webhook URL** shown on the _WhatsApp Webhook_ node  
   (format: `https://<your-n8n-host>/webhook/whatsapp-real-estate`)
3. In the [Twilio Console](https://console.twilio.com) → **Messaging → WhatsApp** → your sender:
   - Set **"A MESSAGE COMES IN"** to `Webhook`, method `HTTP POST`
   - Paste the n8n webhook URL

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | Sender number, e.g. `whatsapp:+14155238886` |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model name (default: `gpt-4o`) |
| `GOOGLE_CALENDAR_ID` | Target calendar (default: `primary`) |
| `PROPERTY_WEBSITE_BASE_URL` | Base URL of your property listings page |
| `AGENT_NAME` | AI agent display name shown to leads |
| `REAL_ESTATE_COMPANY_NAME` | Company name shown in messages and emails |

---

## Conversation Flow

### Property Inquiry

> **Lead:** Show me 2BHK flats in Bandra under 80 lakhs  
> **Agent:** Great choice! Bandra has some wonderful options. Here are properties matching your requirements:  
> 🏘️ https://yourrealestate.com/properties?location=Bandra&type=2BHK&max_price=8000000

### Appointment Booking

> **Lead:** I'd like to visit the 3BHK flat in Andheri  
> **Agent:** I'd be happy to book that visit! May I have your name and email address?  
> **Lead:** Rahul Sharma, rahul@example.com  
> **Agent:** What date and time works best for you?  
> **Lead:** 20 March at 11am  
> **Agent:**  
> ✅ **Appointment Confirmed!**  
> 📅 Date & Time: 20 Mar 2026, 11:00 am  
> 🏡 Property: 3BHK Flat, Andheri West  
> 📧 Confirmation email sent to rahul@example.com  
> Our agent will be in touch soon. Thank you! 🙏

---

## Customisation

### Change AI persona

Edit `AGENT_NAME` and `REAL_ESTATE_COMPANY_NAME` in `.env`.

### Use a different AI model

Set `OPENAI_MODEL=gpt-3.5-turbo` in `.env` for lower cost, or `gpt-4o` for best accuracy.

### Add more property filters

In the **Build Property Listing URL** node, add additional `params.set(...)` calls to support filters like number of bathrooms, furnished status, etc.

### Extend conversation memory

Currently each message is stateless. To add memory, replace the OpenAI node with an **AI Agent** node backed by a **Buffer Memory** or **Redis Chat Memory** sub-node in n8n.

---

## File Structure

```
whatsapp-Ai-agent/
├── workflow/
│   └── whatsapp_real_estate_agent.json   # n8n workflow (importable)
├── docs/
│   └── workflow-overview.md              # Detailed node documentation
├── .env.example                          # Environment variable template
├── pod flowchart.pdf                     # Original system flowchart
└── README.md                             # This file
```

---

## Security Notes

- **Never commit your `.env` file.** It is listed in `.gitignore`.
- Rotate `TWILIO_AUTH_TOKEN` and `OPENAI_API_KEY` regularly.
- In production, host n8n behind HTTPS and restrict the webhook path with a secret token.
- Consider adding a Twilio request signature validator as a middleware in n8n to prevent spoofed webhook calls.

---

## License

MIT
