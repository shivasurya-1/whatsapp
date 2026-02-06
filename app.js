// Import Express.js and axios
const express = require('express');
const axios = require('axios');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use('/images', express.static('public/images'));


// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests (webhook verification)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests (incoming webhook events)
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
});

/*
  POST /send
  Body options:
  - { "to": "<single-number>", "message": "..." }
  - { "numbers": ["<num1>", "<num2>"], "message": "..." }

  Environment variables required to actually send:
  - WHATSAPP_TOKEN            (your Graph API access token)
  - WHATSAPP_PHONE_NUMBER_ID  (the phone number ID from your WhatsApp business account)
*/
app.post('/send', async (req, res) => {
  const { numbers, to } = req.body || {};
  const recipients = Array.isArray(numbers) ? numbers : (to ? [to] : []);

  if (!recipients.length) {
    return res.status(400).json({ error: 'Missing "to" or "numbers".' });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ error: 'Missing WhatsApp credentials in environment variables.' });
  }

  const results = [];

  for (const recipient of recipients) {
    const toNumber = String(recipient).replace(/^\+/, '');
 const templateName= process.env.TEMPLATE_NAME;
    try {
      const resp = await axios.post(
        `https://graph.facebook.com/v17.0/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          to: toNumber,
          type: "template",
          template: {
            name: templateName, // 👈 EXACT template name from Meta
            language: { code: "en_US" },    
            components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: "https://whatsapp-1qkf.onrender.com/image/aiml.jpeg"   // 👈 REQUIRED
              }
            }
          ]
        }
      ]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      results.push({ to: recipient, status: "sent", response: resp.data });
      console.log("Template sent to", toNumber, resp.data);

    } catch (err) {
      const errInfo = err.response?.data ?? { message: err.message };
      results.push({ to: recipient, status: "error", error: errInfo });
      console.error("Error sending to", toNumber, errInfo);
    }
  }

  res.json({ results });
});

app.post('/sendhw', async (req, res) => {
  const { numbers, to } = req.body || {};
  const recipients = Array.isArray(numbers) ? numbers : (to ? [to] : []);

  if (!recipients.length) {
    return res.status(400).json({ error: 'Missing "to" or "numbers".' });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ error: 'Missing WhatsApp credentials in environment variables.' });
  }

  const results = [];

  for (const recipient of recipients) {
    const toNumber = String(recipient).replace(/^\+/, '');

    try {
      const resp = await axios.post(
        `https://graph.facebook.com/v17.0/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          to: toNumber,
          type: "template",
          template: {
            name: "event_details_reminder_1", // 👈 EXACT template name from Meta
            language: { code: "en_US" }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      results.push({ to: recipient, status: "sent", response: resp.data });
      console.log("Template sent to", toNumber, resp.data);

    } catch (err) {
      const errInfo = err.response?.data ?? { message: err.message };
      results.push({ to: recipient, status: "error", error: errInfo });
      console.error("Error sending to", toNumber, errInfo);
    }
  }

  res.json({ results });
});


// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
