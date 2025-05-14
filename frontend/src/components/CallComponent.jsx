import React, { useEffect, useState } from 'react';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';

const CallComponent = () => {
  const [device, setDevice] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [currentCall, setCurrentCall] = useState(null);
  const [callSid, setCallSid] = useState(null);

  useEffect(() => {
    const initDevice = async () => {
      try {
        const res = await fetch('http://localhost:5000/token?identity=YashDangar');
        const data = await res.json();
        console.log('Token response:', data);

        const newDevice = new Device(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          allowIncomingWhileBusy: true,
          debug: true,
        });

        newDevice.on('ready', () => {
          console.log('Twilio Device Ready!');
          setStatus('Device ready to make calls');
        });

        newDevice.on('error', (error) => {
          console.error('Device Error:', error);
          setStatus('Error: ' + error.message);
        });

        newDevice.on('connect', (connection) => {
          console.log('Call connected');
          setCallActive(true);
          setCurrentCall(connection);
          setCallSid(connection.parameters.CallSid);
          setStatus('On call');
        });

        newDevice.on('disconnect', () => {
          console.log('Call ended');
          setCallActive(false);
          setCurrentCall(null);
          setCallSid(null);
          setStatus('Call ended');
        });

        setDevice(newDevice);
      } catch (error) {
        console.error('Error initializing Twilio Device:', error);
        setStatus('Failed to initialize');
      }
    };

    initDevice();

    // Cleanup function
    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, []);

  const makeCall = async () => {
    try {
      if (device) {
        console.log('Placing call to: +919313932890');
        const connection = await device.connect({ To: '+919313932890' });
        console.log('Call connection:', connection);
        setCallActive(true);
        setCurrentCall(connection);
        setCallSid(connection.parameters.CallSid);
        setStatus('Call in progress...');
      }
    } catch (error) {
      console.error('Error making call:', error);
      setStatus('Error making call');
    }
  };

  const hangupCall = async () => {
    try {
      console.log('Hangup attempt - Current state:', {
        callActive,
        hasCallSid: !!callSid,
        hasCurrentCall: !!currentCall
      });

      if (currentCall) {
        console.log('Disconnecting current call');
        currentCall.disconnect();
      } else if (device) {
        console.log('Disconnecting all calls');
        device.disconnectAll();
      }

      // Also try the backend hangup if we have a callSid
      if (callSid) {
        try {
          const response = await axios.post('http://localhost:5000/api/hangup', {
            callSid: callSid
          });
          console.log('Backend hangup response:', response.data);
        } catch (error) {
          console.error('Backend hangup error:', error);
        }
      }

      setCallActive(false);
      setCurrentCall(null);
      setCallSid(null);
      setStatus('Call ended');
    } catch (error) {
      console.error('Error hanging up call:', error);
      setStatus('Error hanging up call');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-2xl font-bold">📞 Web Call via Twilio</h2>
      <p className="text-gray-600">{status}</p>
      <div className="flex gap-4">
        <button
          onClick={makeCall}
          disabled={callActive}
          className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Call Now
        </button>
        <button
          onClick={hangupCall}
          className={`px-6 py-2 rounded-xl ${
            callActive 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          Hang Up
        </button>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Call Active: {callActive ? 'Yes' : 'No'}</p>
        <p>Call SID: {callSid || 'None'}</p>
      </div>
    </div>
  );
};

export default CallComponent;
