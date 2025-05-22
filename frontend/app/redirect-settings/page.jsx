'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from 'lucide-react'
import { API_URL } from "@/config"

export default function RedirectSettingsPage() {
  const [currentNumber, setCurrentNumber] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchRedirectNumber = useCallback(async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const response = await fetch(`${API_URL}/api/redirect-number`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch redirect number')
      }
      const data = await response.json()
      setCurrentNumber(data.number)
      setNewNumber(data.number) // Initialize input with current number
    } catch (error) {
      console.error("Fetch error:", error)
      setMessage({ type: 'error', text: error.message })
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchRedirectNumber()
  }, [fetchRedirectNumber])

  const handleSave = async () => {
    if (!newNumber) {
      setMessage({ type: 'error', text: 'Redirect number cannot be empty.' })
      return
    }
    // Basic E.164 format validation (client-side for better UX)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(newNumber)) {
        setMessage({ type: 'error', text: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890).' });
        return;
    }

    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`${API_URL}/api/redirect-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: newNumber }),
      })

      const responseData = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update redirect number');
      }
      
      setCurrentNumber(responseData.number)
      setNewNumber(responseData.number)
      setMessage({ type: 'success', text: 'Redirect number updated successfully!' })
    } catch (error) {
      console.error("Save error:", error)
      setMessage({ type: 'error', text: error.message })
    }
    setIsSaving(false)
  }

  return (
    <div className="container p-4 mx-auto md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-6 text-3xl font-bold">Redirect Settings</h1>
        
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
            <Terminal className="w-4 h-4" />
            <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="p-6 rounded-lg shadow-md bg-card">
          <div className="mb-4">
            <h2 className="mb-2 text-xl font-semibold">Current Redirect Number</h2>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : currentNumber ? (
              <p className="p-3 font-mono text-2xl rounded-md bg-muted">{currentNumber}</p>
            ) : (
              <p className="text-muted-foreground">No redirect number is currently set.</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
                <label htmlFor="newNumber" className="block mb-1 text-sm font-medium text-muted-foreground">
                Set New Redirect Number (E.164 format, e.g., +1234567890)
                </label>
                <Input
                id="newNumber"
                type="tel"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="+1234567890"
                className="max-w-xs"
                disabled={isSaving || isLoading}
                />
            </div>
            <Button onClick={handleSave} disabled={isSaving || isLoading || newNumber === currentNumber}>
              {isSaving ? 'Saving...' : 'Save Redirect Number'}
            </Button>
          </div>
        </div>

         <div className="p-4 mt-6 border rounded-md bg-secondary/50">
            <h3 className="mb-2 text-lg font-semibold">How this works:</h3>
            <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                <li>All incoming calls to your Twilio number will be forwarded to the number specified above.</li>
                <li>If no number is set here, the system will attempt to use a fallback number defined in the environment variables on the server.</li>
                <li>If neither is available, calls might not be forwarded correctly.</li>
                <li>Ensure the number is in the correct E.164 international format (e.g., +14155552671 for a US number).</li>
            </ul>
        </div>

      </div>
    </div>
  )
} 