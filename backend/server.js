import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import callRoutes from './routes/call.js';

// Load environment variables
dotenv.config();

// Debug logging
console.log('Environment variables loaded:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'Present' : 'Missing');

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

app.use('/api/call', callRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
