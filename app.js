// Import Express.js and axios
const express = require('express');
const axios = require('axios');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

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
  const { numbers, to, message } = req.body;
  const recipients = Array.isArray(numbers) ? numbers : (to ? [to] : []);
  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'Missing "to" or "numbers" array in request body.' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Missing "message" in request body.' });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    // If credentials missing, return helpful error (do not attempt to call API)
    return res.status(500).json({
      error: 'WHATSAPP_TOKEN and/or WHATSAPP_PHONE_NUMBER_ID not set in environment. Set them to send real messages.'
    });
  }

  const results = [];
  for (const recipient of recipients) {
    // Strip leading + if provided
    const toNumber = String(recipient).replace(/^\+/, '');
    try {
      const resp = await axios.post(
        `https://graph.facebook.com/v17.0/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      results.push({ to: recipient, status: 'sent', response: resp.data });
      console.log(`Message sent to ${toNumber}:`, resp.data);
    } catch (err) {
      // Normalize error info
      const errInfo = err.response?.data ?? { message: err.message };
      results.push({ to: recipient, status: 'error', error: errInfo });
      console.error(`Error sending to ${toNumber}:`, errInfo);
    }
  }

  res.json({ results });
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
