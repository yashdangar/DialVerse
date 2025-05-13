import express from 'express';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Twilio client with explicit credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Validate credentials before creating client
if (!accountSid || !authToken) {
  throw new Error('Twilio credentials are missing. Please check your .env file.');
}

// Create Twilio client
const client = twilio(accountSid, authToken);

router.post('/', async (req, res) => {
  const { toPhoneNumber } = req.body;

  if (!toPhoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    console.log('Making call with credentials:');
    console.log('From:', process.env.TWILIO_PHONE_NUMBER);
    console.log('To:', toPhoneNumber);
    
    const call = await client.calls.create({
      url: 'http://demo.twilio.com/docs/voice.xml',
      to: toPhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    res.status(200).json({ message: 'Call initiated', callSid: call.sid });
  } catch (error) {
    console.error('Twilio Call Error:', error);
    res.status(500).json({ 
      message: 'Failed to make call', 
      error: error.message,
      details: error.moreInfo || 'No additional details available'
    });
  }
});

export default router;
