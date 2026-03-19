# WhatsApp AI Real Estate Agent – Workflow Overview

## Architecture

```
WhatsApp (Twilio) ──► n8n Webhook ──► Parse Message ──► AI Agent (OpenAI)
                                                               │
                                             ┌─────────────────┼─────────────────┐
                                             ▼                 ▼                 ▼
                                      Property Search   Book Appointment   Plain Reply
                                             │                 │
                                    Build Listing URL   Google Calendar
                                             │               + Gmail
                                             │                 │
                                             └────────┬────────┘
                                                      ▼
                                              Merge & Send Reply
                                             (Twilio WhatsApp API)
```

---

## Node-by-Node Description

### 1. WhatsApp Webhook
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.webhook` |
| **Method** | POST |
| **Path** | `whatsapp-real-estate` |
| **Response Mode** | `responseNode` (waits for the Respond node) |

**Purpose:** Entry point. Twilio calls this URL for every inbound WhatsApp message.  
**Setup:** Copy the production webhook URL from n8n and paste it into the Twilio console under _Messaging → WhatsApp → When a message comes in_.

---

### 2. Parse WhatsApp Message
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Normalises the Twilio `application/x-www-form-urlencoded` payload into a clean JSON object with `from`, `phone`, `message`, and `messageSid` fields.

---

### 3. AI Agent (OpenAI)
| Property | Value |
|---|---|
| **Type** | `@n8n/n8n-nodes-langchain.openAi` |
| **Model** | `gpt-4o` (configurable via `OPENAI_MODEL` env var) |
| **Temperature** | 0.4 |

**Purpose:** The conversational brain. Given the user's WhatsApp text it:
- Greets new leads and discovers their requirements
- Detects _property search_ intent and emits an `ACTION:{"type":"property_search",...}` block
- Detects _appointment booking_ intent, collects all required fields, and emits an `ACTION:{"type":"book_appointment",...}` block
- Handles general questions conversationally

**System Prompt customisation:** Update `AGENT_NAME` and `REAL_ESTATE_COMPANY_NAME` environment variables.

---

### 4. Parse AI Response
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Uses a regex to split the OpenAI response into:
- `replyText` – human-readable part to forward to WhatsApp
- `action` – parsed JSON action object (or `null` if none)

---

### 5. Is Property Search? / Is Appointment Booking?
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.if` |

**Purpose:** Routes execution to the correct downstream path based on `action.type`.

---

### 6. Build Property Listing URL
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Builds a deep-link URL to your property listing website:
```
https://www.yourrealestate.com/properties?location=Bandra&type=2BHK&max_price=8000000
```
The parameters are derived from the AI action payload. Configure `PROPERTY_WEBSITE_BASE_URL` in your `.env`.

---

### 7. Create Google Calendar Event
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.googleCalendar` |
| **Duration** | 1 hour |
| **Attendees** | Lead's email (from action payload) |

**Purpose:** Creates a _Property Visit_ appointment on the configured Google Calendar and sends a calendar invite to the lead.  
**Credentials required:** Google Calendar OAuth2.

---

### 8. Send Gmail Confirmation
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.gmail` |
| **Format** | HTML email |

**Purpose:** Sends a branded HTML confirmation email to the lead summarising the appointment details.  
**Credentials required:** Gmail OAuth2.

---

### 9. Compose Booking Reply
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Composes a WhatsApp-formatted confirmation message including date, property name, and email confirmation notice.

---

### 10. Plain Conversation Reply
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Pass-through node for general chat messages that require no calendar or search action.

---

### 11. Merge Replies
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.merge` |
| **Mode** | `chooseBranch` |

**Purpose:** Collects the final reply from whichever branch ran and passes it to the sender.

---

### 12. Send WhatsApp Reply (Twilio)
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.code` (JavaScript) |

**Purpose:** Calls the Twilio Messaging REST API to send the composed reply back to the lead's WhatsApp number using `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.

---

### 13. Respond to Twilio Webhook
| Property | Value |
|---|---|
| **Type** | `n8n-nodes-base.respondToWebhook` |
| **Status** | 200 OK |

**Purpose:** Acknowledges the original Twilio webhook request so Twilio does not retry it.

---

## Data Flow – Property Inquiry Example

```
User: "Show me 2BHK flats in Bandra under 80 lakhs"
  │
  ▼
AI Agent produces:
  "Sure! Here are some great options in Bandra. 🏡
   ACTION:{"type":"property_search","location":"Bandra","property_type":"2BHK","budget":"8000000"}"
  │
  ▼
Build Property Listing URL:
  https://www.yourrealestate.com/properties?location=Bandra&type=2BHK&max_price=8000000
  │
  ▼
WhatsApp reply sent:
  "Sure! Here are some great options in Bandra. 🏡

   Browse matching properties here:
   https://www.yourrealestate.com/properties?location=Bandra&type=2BHK&max_price=8000000"
```

---

## Data Flow – Appointment Booking Example

```
User: "I'd like to visit the 3BHK flat in Andheri on 20 March at 11am"
  │
  ▼
AI Agent (after collecting name + email):
  "Perfect, I'll book that for you!
   ACTION:{"type":"book_appointment","lead_name":"Rahul Sharma",
            "lead_email":"rahul@example.com","lead_phone":"+919876543210",
            "property":"3BHK Flat, Andheri West",
            "preferred_datetime":"2026-03-20T11:00:00+05:30"}"
  │
  ├─► Google Calendar: event created, invite sent to rahul@example.com
  ├─► Gmail: HTML confirmation email sent
  └─► WhatsApp reply:
        "Appointment Confirmed!
         Date & Time: 20 Mar 2026, 11:00 am
         Property: 3BHK Flat, Andheri West
         A confirmation email has been sent to rahul@example.com.
         Our agent will be in touch soon. Thank you!"
```
