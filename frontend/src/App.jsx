import React from 'react';
import CallForm from './components/CallForm';
import IncomingCallHandler from './components/IncomingCallHandler';
import CallComponent from './components/CallComponent';
function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Twilio Call System</h1>
        <div className="grid gap-8">
            <CallComponent />
        </div>
      </div>
    </div>
  );
}

export default App;
