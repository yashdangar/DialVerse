import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import callRoutes from './routes/call.js';
import twilio from 'twilio';
// Load environment variables
dotenv.config();


// Debug logging
// console.log('Environment variables loaded:');
// console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
// console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
// console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'Present' : 'Missing');

// Log the actual values (partially masked)
if (process.env.TWILIO_ACCOUNT_SID) {
  console.log('Account SID format check:', process.env.TWILIO_ACCOUNT_SID.startsWith('AC'));
}
if (process.env.TWILIO_AUTH_TOKEN) {
  console.log('Auth Token length:', process.env.TWILIO_AUTH_TOKEN.length);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api/call', callRoutes);

// Handle voice calls at root path
app.post('/', (req, res) => {
  try {
    console.log('Received voice webhook request at root path');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // First say something to the caller
    twiml.say('Please wait while we connect your call');

    // Create the dial verb
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      timeout: 30,
      record: 'record-from-answer',
      recordingStatusCallback: '/recording-status',
      recordingStatusCallbackEvent: 'completed',
      recordingStatusCallbackMethod: 'POST',
      hangupOnStar: true
    });

    // Add the number to dial with proper formatting
    const receiverNumber = '+919313932890'; // Make sure this is in E.164 format
    console.log('Dialing number:', receiverNumber);
    dial.number(receiverNumber, {
      statusCallback: '/call-status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    const response = twiml.toString();
    console.log('Generated TwiML:', response);

    res.type('text/xml');
    res.send(response);
  } catch (error) {
    console.error('Error in voice webhook:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred while processing your call.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle recording status
app.post('/recording-status', (req, res) => {
  try {
    console.log('Recording status update:', req.body);
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;
    const recordingStatus = req.body.RecordingStatus;
    
    // You can store the recording URL and SID in your database here
    console.log(`Recording ${recordingSid} status: ${recordingStatus}`);
    console.log(`Recording URL: ${recordingUrl}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling recording status:', error);
    res.sendStatus(500);
  }
});

// Handle hangup
app.post('/hangup', async (req, res) => {
  try {
    console.log('Hangup request received');
    
    // Get the call SID from the request
    const callSid = req.body.CallSid;
    
    if (callSid) {
      // Create Twilio client
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // Update the call to end it
      await client.calls(callSid)
        .update({ status: 'completed' });
      
      console.log(`Call ${callSid} has been terminated`);
    }

    // Generate TwiML response
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling hangup:', error);
    // Even if there's an error, try to send a hangup TwiML
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Keep the GET endpoint for testing
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Add a test endpoint for voice
app.get('/voice', (req, res) => {
  res.send('Voice endpoint is accessible');
});

// Add call status callback endpoint
app.post('/call-status', (req, res) => {
  try {
    console.log('Call status update:', req.body);
    const callStatus = req.body.CallStatus;
    const callSid = req.body.CallSid;
    const to = req.body.To;
    const from = req.body.From;

    console.log(`Call ${callSid} status: ${callStatus}`);
    console.log(`From: ${from} To: ${to}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling call status:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 5000;


const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

app.get('/token', (req, res) => {
  const identity = req.query.identity;
  if (!identity) {
    return res.status(400).json({ error: 'Identity is required' });
  }
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
  });

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity } 
  );
  token.addGrant(voiceGrant);
  token.identity = 'user-' + Math.floor(Math.random() * 10000);

  res.send({
    token: token.toJwt(),
  });
});

app.post('/voice', (req, res) => {
  try {
    console.log('Received voice webhook request at root path');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // First say something to the caller
    twiml.say('Please wait while we connect your call');

    // Create the dial verb
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      timeout: 30,
      record: 'record-from-answer',
      recordingStatusCallback: '/recording-status',
      recordingStatusCallbackEvent: 'completed',
      recordingStatusCallbackMethod: 'POST',
      hangupOnStar: true
    });

    // Add the number to dial with proper formatting
    const receiverNumber = '+919313932890'; // Make sure this is in E.164 format
    console.log('Dialing number:', receiverNumber);
    dial.number(receiverNumber, {
      statusCallback: '/call-status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    const response = twiml.toString();
    console.log('Generated TwiML:', response);

    res.type('text/xml');
    res.send(response);
  } catch (error) {
    console.error('Error in voice webhook:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred while processing your call.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Add hangup endpoint
app.post('/api/hangup', async (req, res) => {
  try {
    const { callSid } = req.body;
    console.log('Hangup request received for call:', callSid);

    if (!callSid) {
      return res.status(400).json({ error: 'Call SID is required' });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Update the call to end it
    await client.calls(callSid)
      .update({ status: 'completed' });

    console.log(`Call ${callSid} has been terminated`);
    res.json({ success: true, message: 'Call terminated successfully' });
  } catch (error) {
    console.error('Error hanging up call:', error);
    res.status(500).json({ error: 'Failed to hang up call' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
