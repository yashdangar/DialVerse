import express from 'express';
import twilio from 'twilio';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const router = express.Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials are missing. Please check your .env file.');
}

const client = twilio(accountSid, authToken);

// 📞 Initiate call to caller
router.post('/', async (req, res) => {
  const { callerPhoneNumber, receiverPhoneNumber } = req.body;

  if (!callerPhoneNumber || !receiverPhoneNumber) {
    return res.status(400).json({ message: 'Both caller and receiver numbers are required' });
  }

  try {
    console.log('Making call with credentials:');
    console.log('From:', process.env.TWILIO_PHONE_NUMBER);
    console.log('To:', callerPhoneNumber);

    const call = await client.calls.create({
      url: `${process.env.NGROK_URL}/api/call/handle-call?receiverPhoneNumber=${receiverPhoneNumber}`,
      to: callerPhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    res.status(200).json({ message: 'Call initiated to caller', callSid: call.sid });
  } catch (error) {
    console.error('Twilio Call Error:', error);
    res.status(500).json({ message: 'Failed to make call', error: error.message });
  }
});

// 🎙️ When caller picks up — connect to receiver and start recording
router.post('/handle-call', (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const receiverPhoneNumber = req.query.receiverPhoneNumber;

  if (!receiverPhoneNumber) {
    return res.status(400).send('Receiver phone number is required.');
  }

  const dial = twiml.dial({
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${process.env.NGROK_URL}/api/call/recording-callback`,
    recordingStatusCallbackMethod: 'POST',
  });

  dial.number(receiverPhoneNumber);

  res.type('text/xml');
  res.send(twiml.toString());
});

// 📥 Handle recording callback received from Twilio
router.post('/recording-callback', async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  console.log('Recording URL:', recordingUrl); // Confirm this URL

  if (!recordingUrl) {
    return res.status(400).send('Recording URL is missing.');
  }

  try {
    // Download the recording file
    await downloadRecording(recordingUrl);
    res.status(200).send('Recording callback received.');
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).send('Error downloading recording.');
  }
});

// 📝 Fetch recording from Twilio using Recording SID
router.get('/get-recording/:recordingSid', async (req, res) => {
  const { recordingSid } = req.params;

  if (!recordingSid) {
    return res.status(400).json({ message: 'Recording SID is required' });
  }

  try {
    // Fetch the recording details using the Recording SID
    const recording = await client.recordings(recordingSid).fetch();

    console.log('Recording details:', recording);
    downloadRecording( );
    // Return the recording details
    res.status(200).json({
      message: 'Recording fetched successfully',
      recording,
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({
      message: 'Failed to fetch recording',
      error: error.message,
    });
  }
});

// 📥 Download the recording file from the Recording URL
async function downloadRecording(recordingUrl) {
  try {
    // Ensure URL is valid
    const validUrl = new URL(recordingUrl);

    const response = await axios.get(validUrl.href, {
      responseType: 'stream',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
      },
    });

    const filePath = path.resolve(__dirname, 'recording.mp3');
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log('Recording saved to:', filePath);
    });

    writer.on('error', (err) => {
      console.error('Error saving recording:', err);
    });
  } catch (error) {
    console.error('Error downloading recording:', error.message);
    throw new Error('Download failed');
  }
}

// 📞 Handle incoming call to your Twilio number
router.post('/incoming-call', (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: `${process.env.NGROK_URL}/api/call/handle-input`,
    method: 'POST',
  });

  gather.say('Press 1 to connect to our agent.');

  // If no input, redirect back to prompt
  twiml.redirect(`${process.env.NGROK_URL}/api/call/incoming-call`);

  res.type('text/xml');
  res.send(twiml.toString());
});

// 🎛️ Handle user input (DTMF)
router.post('/handle-input', (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const digits = req.body.Digits;
  console.log('User pressed:', digits);

  if (digits === '1') {
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.NGROK_URL}/api/call/recording-callback`,
      recordingStatusCallbackMethod: 'POST',
    });
    console.log('Dialing agent...');
    dial.number('+918460050845'); // replace with your desired number

  } else {
    twiml.say('Invalid input. Goodbye.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});




export default router;
