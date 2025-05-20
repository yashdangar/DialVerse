import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import callRoutes from './routes/call.js';
import questionsRoutes from './routes/questions.js';
import twilio from 'twilio';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import OpenAI from 'openai';

// Initialize Prisma client with correct configuration
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Handle Prisma connection errors
prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: ['https://call-managment.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Length', 'Accept-Ranges'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Handle OPTIONS requests
app.options('*', cors());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

app.use('/api/call', callRoutes);
app.use('/api/questions', questionsRoutes);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});
// Handle inbound calls
app.post('/inbound', async (req, res) => {
  try {
    console.log('Received inbound call webhook');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const phoneNumber = req.body.From;
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Create or update phone number record
    const phoneNumberRecord = await prisma.phoneNumber.upsert({
      where: { number: phoneNumber },
      update: {
        lastCalled: new Date(),
        callCount: { increment: 1 }
      },
      create: {
        number: phoneNumber,
        status: 'ACTIVE',
        lastCalled: new Date(),
        callCount: 1
      }
    });

    // Create call record
    const call = await prisma.call.create({
      data: {
        id: req.body.CallSid,
        status: 'INITIATED',
        direction: 'INBOUND',
        phoneNumberId: phoneNumberRecord.id
      }
    });

    console.log('Created inbound call record:', call.id);
    console.log('Phone number:', phoneNumber);

    // Forward to the destination number
    twiml.say('Please wait while we connect your call');
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      timeout: 30,
      record: 'record-from-answer-dual',
      recordingStatusCallback: '/recording-status',
      recordingStatusCallbackEvent: 'completed',
      recordingStatusCallbackMethod: 'POST',
      hangupOnStar: true
    });

    const forwardToNumber = process.env.FORWARD_TO_NUMBER || '+919313932890';
    console.log('Forwarding inbound call to:', forwardToNumber);

    dial.number(forwardToNumber, {
      statusCallback: '/call-status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    const response = twiml.toString();
    console.log('Generated TwiML:', response);

    res.type('text/xml');
    res.send(response);
  } catch (error) {
    console.error('Error in inbound webhook:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred while processing your call.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle recording status
app.post('/recording-status', async (req, res) => {
  try {
    console.log('Recording status update:', req.body);
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;
    const recordingStatus = req.body.RecordingStatus;
    const callSid = req.body.CallSid;
    const recordingDuration = req.body.RecordingDuration;

    if (!recordingUrl) {
      return res.status(400).send('Recording URL is missing.');
    }

    // Verify that the call exists
    const call = await prisma.call.findUnique({
      where: { id: callSid }
    });

    if (!call) {
      console.error(`Call ${callSid} not found in database`);
      return res.status(404).send('Call not found');
    }

    // Download the recording file
    try {
      const response = await axios.get(recordingUrl, {
        responseType: 'stream',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
      });

      // Use Vercel's /tmp directory for temporary files
      const tempDir = '/tmp';
      const tempFilePath = path.join(tempDir, `${recordingSid}.mp3`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      writer.on('finish', async () => {
        console.log('Recording downloaded to temp file:', tempFilePath);

        let recording;
        try {
          // Upload to S3
          const fileStream = fs.createReadStream(tempFilePath);
          const s3Key = `recordings/${recordingSid}.mp3`;

          if (!process.env.AWS_S3_BUCKET) {
            throw new Error('AWS_S3_BUCKET environment variable is not set');
          }

          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: 'audio/mpeg'
          };

          await s3Client.send(new PutObjectCommand(uploadParams));

          // Generate S3 URL
          const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

          // Create recording record with Twilio's duration
          recording = await prisma.recording.create({
            data: {
              callId: callSid,
              fileUrl: s3Url,
              fileSize: fs.statSync(tempFilePath).size,
              duration: recordingDuration ? parseInt(recordingDuration) : null
            }
          });

          console.log('Recording record created:', recording.id);

          // Update call duration with Twilio's duration
          await prisma.call.update({
            where: { id: callSid },
            data: {
              duration: recordingDuration ? parseInt(recordingDuration) : null
            }
          });

          console.log('Starting transcription process...');

          // Create form data for OpenAI
          const formData = new FormData();
          formData.append('file', fs.createReadStream(tempFilePath));
          formData.append('model', 'whisper-1');

          // Convert speech to text using OpenAI Whisper
          const transcription = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders()
              },
              maxBodyLength: Infinity,
              maxContentLength: Infinity
            }
          );

          console.log('Transcription response:', transcription.data);

          // Create transcription record
          const transcriptionRecord = await prisma.transcription.create({
            data: {
              recordingId: recording.id,
              text: transcription.data.text,
              status: 'PENDING' // Start with PENDING status
            }
          });

          console.log('Created transcription record:', transcriptionRecord.id);
          console.log('Starting automatic analysis of transcription...');

          // Start analysis in the background
          analyzeTranscription(transcriptionRecord.id, transcription.data.text)
            .catch(error => {
              console.error('Background analysis failed:', error);
            });

          // Clean up temporary file
          fs.unlinkSync(tempFilePath);
          console.log('Temporary file cleaned up');

        } catch (error) {
          console.error('Error processing recording:', error);

          // Only create failed transcription if we have a recording
          if (recording) {
            await prisma.transcription.create({
              data: {
                recordingId: recording.id,
                text: '',
                status: 'FAILED'
              }
            });
          }

          // Clean up temporary file if it exists
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      });

      writer.on('error', (err) => {
        console.error('Error saving recording:', err);
      });
    } catch (error) {
      console.error('Error downloading recording:', error.message);
    }

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
app.post('/call-status', async (req, res) => {
  try {
    console.log('Call status update:', req.body);
    const callStatus = req.body.CallStatus;
    const callSid = req.body.CallSid;
    const to = req.body.To;
    const from = req.body.From;
    const duration = req.body.Duration;

    // Update call record
    await prisma.call.update({
      where: { id: callSid },
      data: {
        status: callStatus.toUpperCase(),
        endTime: callStatus === 'COMPLETED' ? new Date() : null,
        duration: duration ? parseInt(duration) : null
      }
    });

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
  const callType = req.query.callType; // 'inbound' or 'outbound'

  if (!identity) {
    return res.status(400).json({ error: 'Identity is required' });
  }

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
    incomingAllow: true
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
    callType: callType || 'inbound' // Default to inbound if not specified
  });
});

// Handle voice calls at root path (for inbound calls from Twilio)
app.post('/', async (req, res) => {
  try {
    console.log('Received voice webhook request at root path');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // Check if this is a client call or a regular phone call
    const isClientCall = req.body.From?.startsWith('client:');
    const phoneNumber = isClientCall ? req.body.To : req.body.From;

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Create or update phone number record
    const phoneNumberRecord = await prisma.phoneNumber.upsert({
      where: { number: phoneNumber },
      update: {
        lastCalled: new Date(),
        callCount: { increment: 1 }
      },
      create: {
        number: phoneNumber,
        status: 'ACTIVE',
        lastCalled: new Date(),
        callCount: 1
      }
    });

    // Create call record
    const call = await prisma.call.create({
      data: {
        id: req.body.CallSid,
        status: 'INITIATED',
        direction: isClientCall ? 'OUTBOUND' : 'INBOUND',
        phoneNumberId: phoneNumberRecord.id
      }
    });

    console.log('Created call record:', call.id);
    console.log('Call direction:', isClientCall ? 'OUTBOUND' : 'INBOUND');
    console.log('Phone number:', phoneNumber);

    if (isClientCall) {
      // For outbound calls (from client), dial the number directly
      twiml.say('Please wait while we connect your call');
      const dial = twiml.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER,
        timeout: 30,
        record: 'record-from-answer-dual',
        recordingStatusCallback: '/recording-status',
        recordingStatusCallbackEvent: 'completed',
        recordingStatusCallbackMethod: 'POST',
        hangupOnStar: true
      });

      console.log('Dialing outbound call to:', phoneNumber);
      dial.number(phoneNumber, {
        statusCallback: '/call-status',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });
    } else {
      // For inbound calls (from regular phone), forward to FORWARD_TO_NUMBER
      twiml.say('Please wait while we connect your call');
      const dial = twiml.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER,
        timeout: 30,
        record: 'record-from-answer-dual',
        recordingStatusCallback: '/recording-status',
        recordingStatusCallbackEvent: 'completed',
        recordingStatusCallbackMethod: 'POST',
        hangupOnStar: true
      });

      const forwardToNumber = process.env.FORWARD_TO_NUMBER;
      console.log('Forwarding inbound call to:', forwardToNumber);

      dial.number(forwardToNumber, {
        statusCallback: '/call-status',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });
    }

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

// Add test endpoint for transcription
app.get('/test-transcribe', async (req, res) => {
  try {
    // Get the first MP3 file from the recordings directory
    const recordingsDir = path.resolve(__dirname, 'recordings');
    const files = fs.readdirSync(recordingsDir);
    const mp3File = files.find(file => file.endsWith('.mp3'));

    if (!mp3File) {
      return res.status(404).json({ error: 'No MP3 files found in recordings directory' });
    }

    const filePath = path.join(recordingsDir, mp3File);
    console.log('Testing transcription with file:', filePath);

    // Create form data for OpenAI
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    // Convert speech to text using OpenAI Whisper
    const transcription = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log('Transcription response:', transcription.data);

    // Save the transcription to a text file
    const transcriptionPath = path.join(recordingsDir, mp3File.replace('.mp3', '.txt'));
    fs.writeFileSync(transcriptionPath, transcription.data.text);
    console.log('Transcription saved to:', transcriptionPath);

    res.json({
      success: true,
      message: 'Transcription completed',
      transcription: transcription.data.text,
      file: mp3File
    });
  } catch (error) {
    console.error('Error in test transcription:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No response data'
    });
  }
});

// Add call history endpoint
app.get('/api/call-history', async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      include: {
        phoneNumber: true,
        recording: {
          include: {
            transcription: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 50 // Limit to last 50 calls
    });

    const formattedCalls = calls.map(call => {
      // Format duration as MM:SS
      const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Format date
      const formatDate = (date) => {
        const now = new Date();
        const callDate = new Date(date);
        const diffDays = Math.floor((now - callDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          return `Today, ${callDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
          return `Yesterday, ${callDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } else {
          return callDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
        }
      };

      return {
        id: call.id,
        phoneNumberId: call.phoneNumberId,
        number: call.phoneNumber.number,
        date: formatDate(call.startTime),
        duration: formatDuration(call.duration),
        status: call.status,
        hasRecording: !!call.recording,
        hasTranscription: !!call.recording?.transcription,
        transcription: call.recording?.transcription?.text || null
      };
    });

    res.json(formattedCalls);
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Add phone numbers endpoint
app.get('/api/phone-numbers', async (req, res) => {
  try {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      include: {
        _count: {
          select: {
            calls: true
          }
        },
        calls: {
          orderBy: {
            startTime: 'desc'
          },
          take: 1,
          select: {
            startTime: true
          }
        }
      },
      orderBy: {
        lastCalled: 'desc'
      }
    });

    const formattedNumbers = phoneNumbers.map(number => {
      // Get the most recent call
      const lastCall = number.calls[0];

      // Format the last called date
      const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toISOString().split('T')[0];
      };

      return {
        id: number.id,
        number: number.number,
        lastCalled: formatDate(lastCall?.startTime || number.lastCalled),
        callCount: number._count.calls,
        status: number.status.toLowerCase()
      };
    });

    res.json(formattedNumbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

// Add endpoint to update phone number status
app.patch('/api/phone-numbers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status?.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedNumber = await prisma.phoneNumber.update({
      where: { id },
      data: { status: status.toUpperCase() }
    });

    res.json(updatedNumber);
  } catch (error) {
    console.error('Error updating phone number status:', error);
    res.status(500).json({ error: 'Failed to update phone number status' });
  }
});

// Add endpoint to get call details and recordings for a phone number
app.get('/api/phone-numbers/:id/calls', async (req, res) => {
  try {
    const { id } = req.params;

    // Get phone number details with only the current call
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            calls: true
          }
        },
        calls: {
          include: {
            recording: {
              include: {
                transcription: {
                  include: {
                    answers: {
                      include: {
                        question: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Format the phone number details
    const numberDetails = {
      id: phoneNumber.id,
      number: phoneNumber.number,
      callCount: phoneNumber._count.calls,
      lastCalled: phoneNumber.lastCalled ? new Date(phoneNumber.lastCalled).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Never'
    };

    // Format the call recordings
    const callRecordings = phoneNumber.calls.map(call => {
      const startTime = new Date(call.startTime);
      const duration = call.duration ? Math.floor(call.duration / 60) + ':' +
        (call.duration % 60).toString().padStart(2, '0') : '0:00';

      // Get questions and answers from the transcription
      const questions = call.recording?.transcription?.answers.map(a => ({
        id: a.question.id,
        text: a.question.text,
        answer: a.text
      })) || [];

      return {
        id: call.id,
        recordingId: call.recording?.id,
        date: startTime.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }),
        duration,
        direction: call.direction,
        transcription: call.recording?.transcription?.text || null,
        questions: questions,
        audioUrl: call.recording?.fileUrl || null
      };
    });

    res.json({
      numberDetails,
      callRecordings
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    res.status(500).json({ error: 'Failed to fetch call details' });
  }
});

// Add endpoint to proxy audio requests
app.get('/api/recordings/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;

    // Get the recording from the database
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId }
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Get the file from S3
    const s3Key = recording.fileUrl.split('.com/')[1];
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    });

    const response = await s3Client.send(command);

    // Set appropriate headers for CORS and streaming
    res.setHeader('Access-Control-Allow-Origin', 'https://call-managment.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.ContentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // Handle range requests for streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : response.ContentLength - 1;
      const chunksize = (end - start) + 1;

      res.setHeader('Content-Range', `bytes ${start}-${end}/${response.ContentLength}`);
      res.setHeader('Content-Length', chunksize);
      res.status(206);

      if (response.Body instanceof Readable) {
        response.Body.pipe(res);
      } else {
        throw new Error('Invalid response body type');
      }
    } else {
      // If no range is specified, send the entire file
      if (response.Body instanceof Readable) {
        response.Body.pipe(res);
      } else {
        throw new Error('Invalid response body type');
      }
    }
  } catch (error) {
    console.error('Error streaming recording:', error);
    res.status(500).json({ error: 'Failed to stream recording' });
  }
});

// Function to analyze transcription against questions
async function analyzeTranscription(transcriptionId, transcriptionText) {
  try {
    console.log('='.repeat(50));
    console.log(`Starting analysis for transcription ${transcriptionId}`);
    console.log('='.repeat(50));

    // Get all questions
    console.log('Fetching questions from database...');
    const questions = await prisma.question.findMany({
      orderBy: {
        order: 'asc'
      }
    });

    if (questions.length === 0) {
      console.log('No questions found in database. Please add questions first.');
      return;
    }

    console.log(`Found ${questions.length} questions to analyze`);
    console.log('Questions:', questions.map(q => q.text).join('\n'));

    // For each question, use OpenAI to analyze the transcription
    for (const question of questions) {
      console.log('\n' + '-'.repeat(50));
      console.log(`Analyzing question: "${question.text}"`);

      const prompt = `You are given a call transcription between two people. Based on this transcription, answer the following question: "${question.text}"

      Transcription:
      ${transcriptionText}

      Provide a clear and concise answer strictly based on the content of the transcription. Do not infer or assume any information beyond what is explicitly stated. If the transcription does not contain enough information to answer the question, respond with: "No clear answer available from the transcription." Do not alter the meaning of anything said.`;

      console.log('Sending request to OpenAI...');
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        max_tokens: 150
      });

      const answer = completion.choices[0].message.content;
      console.log('Received answer from OpenAI:', answer);

      // Create answer record
      console.log('Creating answer record in database...');
      const answerRecord = await prisma.answer.create({
        data: {
          questionId: question.id,
          text: answer,
          transcriptionId: transcriptionId
        }
      });
      console.log('Answer record created successfully:', answerRecord.id);
    }

    // Update transcription status
    console.log('\nUpdating transcription status to COMPLETED');
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: { status: 'COMPLETED' }
    });
    console.log('Analysis completed successfully');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\nError analyzing transcription:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }

    // Update transcription status to failed
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: { status: 'FAILED' }
    });
    throw error;
  }
}

// Update the transcription processing endpoint
app.post('/process-transcription', async (req, res) => {
  try {
    const { transcriptionId } = req.body;
    console.log(`Received request to process transcription ${transcriptionId}`);

    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
      include: {
        questions: true
      }
    });

    if (!transcription) {
      console.log(`Transcription ${transcriptionId} not found`);
      return res.status(404).json({ error: 'Transcription not found' });
    }

    console.log(`Found transcription with text length: ${transcription.text.length}`);
    console.log(`Existing questions: ${transcription.questions.length}`);

    // Start analysis in the background
    analyzeTranscription(transcriptionId, transcription.text)
      .catch(error => {
        console.error('Background analysis failed:', error);
      });

    res.json({ message: 'Transcription analysis started' });
  } catch (error) {
    console.error('Error processing transcription:', error);
    res.status(500).json({ error: 'Failed to process transcription' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
