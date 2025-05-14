import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IncomingCallHandler = () => {
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to handle incoming call notifications
  const handleIncomingCall = async (callData) => {
    try {
      setLoading(true);
      // Here you would typically handle the incoming call
      // For example, you might want to show a notification
      console.log('Incoming call:', callData);
      
      // Add the call to the list of incoming calls
      setIncomingCalls(prev => [...prev, {
        ...callData,
        timestamp: new Date().toISOString(),
        status: 'incoming'
      }]);
    } catch (err) {
      setError('Failed to handle incoming call');
      console.error('Error handling incoming call:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle call status updates
  const handleCallStatus = (callSid, status) => {
    setIncomingCalls(prev => 
      prev.map(call => 
        call.sid === callSid 
          ? { ...call, status } 
          : call
      )
    );
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Incoming Calls</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {incomingCalls.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No incoming calls</p>
        ) : (
          incomingCalls.map((call) => (
            <div 
              key={call.sid} 
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">From: {call.from}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(call.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    call.status === 'incoming' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : call.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
              
              {call.status === 'incoming' && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleCallStatus(call.sid, 'accepted')}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleCallStatus(call.sid, 'rejected')}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Processing call...</p>
        </div>
      )}
    </div>
  );
};

export default IncomingCallHandler; 