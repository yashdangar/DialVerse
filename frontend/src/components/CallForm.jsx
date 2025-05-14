import React, { useState } from 'react';
import axios from 'axios';

const CallForm = () => {
  const [callerPhoneNumber, setCallerPhoneNumber] = useState('');
  const [receiverPhoneNumber, setReceiverPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const makeCall = async () => {
    if (!callerPhoneNumber || !receiverPhoneNumber) {
      setMessage('Both caller and receiver numbers are required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/call', {
        callerPhoneNumber,
        receiverPhoneNumber,
      });
      setMessage(`Call initiated successfully! Call SID: ${response.data.callSid}`);
    } catch (error) {
      console.error('Error making call:', error);
      setMessage(error.response?.data?.message || 'Failed to make call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Make a Call</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caller Phone Number
          </label>
          <input
            type="tel"
            placeholder="+1234567890"
            value={callerPhoneNumber}
            onChange={(e) => setCallerPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receiver Phone Number
          </label>
          <input
            type="tel"
            placeholder="+1234567890"
            value={receiverPhoneNumber}
            onChange={(e) => setReceiverPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={makeCall}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Initiating Call...' : 'Make Call'}
        </button>
        {message && (
          <p className={`mt-4 p-3 rounded-md ${
            message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default CallForm;
