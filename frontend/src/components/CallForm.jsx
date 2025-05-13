import React, { useState } from 'react';
import axios from 'axios';

const CallForm = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');

  const makeCall = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/call', {
        toPhoneNumber: phoneNumber,
      });
      setMessage(response.data.message);
    } catch (error) {
      console.error('Error making call:', error);
      setMessage('Failed to make call');
    }
  };

  return (
    <div>
      <h2>Make a Call</h2>
      <input
        type="tel"
        placeholder="+1234567890"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <button onClick={makeCall}>Call</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CallForm;
