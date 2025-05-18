"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, PhoneOff, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Device } from "@twilio/voice-sdk"
import axios from "axios"

export default function DialerPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [callStatus, setCallStatus] = useState("idle") // "idle" | "ringing" | "ongoing" | "ended"
  const [callDuration, setCallDuration] = useState(0)
  const [device, setDevice] = useState(null)
  const [currentCall, setCurrentCall] = useState(null)
  const [callSid, setCallSid] = useState(null)
  const [callHistory, setCallHistory] = useState([
    { id: 1, number: "+1 (555) 123-4567", date: "Today, 10:30 AM", duration: "5:23" },
    { id: 2, number: "+1 (555) 987-6543", date: "Today, 9:15 AM", duration: "2:47" },
    { id: 3, number: "+1 (555) 456-7890", date: "Yesterday, 3:20 PM", duration: "8:12" },
    { id: 4, number: "+1 (555) 234-5678", date: "Yesterday, 11:05 AM", duration: "1:30" },
    { id: 5, number: "+1 (555) 876-5432", date: "Jun 12, 2:45 PM", duration: "4:18" },
  ])

  useEffect(() => {
    const initDevice = async () => {
      try {
        const res = await fetch('http://localhost:5000/token?identity=YashDangar')
        const data = await res.json()
        console.log('Token response:', data)

        const newDevice = new Device(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          allowIncomingWhileBusy: true,
          debug: true,
        })

        newDevice.on('ready', () => {
          console.log('Twilio Device Ready!')
          setCallStatus("idle")
        })

        newDevice.on('error', (error) => {
          console.error('Device Error:', error)
          setCallStatus("ended")
        })

        newDevice.on('connect', (connection) => {
          console.log('Call connected')
          setCallStatus("ongoing")
          setCurrentCall(connection)
          setCallSid(connection.parameters.CallSid)
          
          // Start call duration timer
          const intervalId = setInterval(() => {
            setCallDuration((prev) => prev + 1)
          }, 1000)

          // Store interval ID in connection object for cleanup
          connection.intervalId = intervalId
        })

        newDevice.on('disconnect', () => {
          console.log('Call ended')
          if (currentCall && currentCall.intervalId) {
            clearInterval(currentCall.intervalId)
          }
          setCallStatus("ended")
          setCurrentCall(null)
          setCallSid(null)

          // Add to call history
          const newCall = {
            id: Date.now(),
            number: phoneNumber,
            date: new Date().toLocaleString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
              month: "short",
              day: "numeric",
            }),
            duration: `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}`,
          }

          setCallHistory((prev) => [newCall, ...prev])

          // Reset after 2 seconds
          setTimeout(() => {
            setCallStatus("idle")
            setCallDuration(0)
          }, 2000)
        })

        setDevice(newDevice)
      } catch (error) {
        console.error('Error initializing Twilio Device:', error)
        setCallStatus("ended")
      }
    }

    initDevice()

    // Cleanup function
    return () => {
      if (device) {
        device.destroy()
      }
    }
  }, [])

  const handleCall = async () => {
    if (phoneNumber.trim() === "") return

    try {
      if (device && phoneNumber) {
        console.log('Placing call to:', phoneNumber)
        setCallStatus("ringing")
        
        // Ensure the number has a + prefix for Twilio
        const numberToCall = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
        
        const connection = await device.connect({ 
          To: numberToCall,
          params: {
            To: numberToCall
          }
        })
        
        console.log('Call connection:', connection)
        setCurrentCall(connection)
        setCallSid(connection.parameters.CallSid)
      }
    } catch (error) {
      console.error('Error making call:', error)
      setCallStatus("ended")
    }
  }

  const handleHangup = async () => {
    try {
      if (currentCall) {
        console.log('Disconnecting current call')
        currentCall.disconnect()
      } else if (device) {
        console.log('Disconnecting all calls')
        device.disconnectAll()
      }

      // Also try the backend hangup if we have a callSid
      if (callSid) {
        try {
          const response = await axios.post('http://localhost:5000/api/hangup', {
            callSid: callSid
          })
          console.log('Backend hangup response:', response.data)
        } catch (error) {
          console.error('Backend hangup error:', error)
        }
      }

      // Reset all states immediately
      setCallStatus("idle")
      setCallDuration(0)
      setPhoneNumber("")
      setCurrentCall(null)
      setCallSid(null)
    } catch (error) {
      console.error('Error hanging up call:', error)
      setCallStatus("idle")
      setPhoneNumber("")
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = () => {
    switch (callStatus) {
      case "ringing":
        return "bg-yellow-500"
      case "ongoing":
        return "bg-green-500"
      case "ended":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatPhoneNumber = (value) => {
    if (!value) return value

    // Remove all non-numeric characters
    const phoneNumber = value.replace(/[^\d]/g, "")

    // Add + prefix if not present
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
  }

  const handlePhoneNumberChange = (e) => {
    const inputValue = e.target.value
    // Only allow numbers and + sign
    if (!/^[0-9+]*$/.test(inputValue)) {
      return
    }
    const formattedPhoneNumber = formatPhoneNumber(inputValue)
    setPhoneNumber(formattedPhoneNumber)
  }

  const handleKeyPress = (e) => {
    // Prevent default behavior for non-numeric keys and + sign
    if (!/^[0-9]$/.test(e.key) && e.key !== '+' && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      e.preventDefault()
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Web Dialer</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Make a Call</CardTitle>
            <CardDescription>Enter a phone number to start a call</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  onKeyPress={handleKeyPress}
                  className="text-lg h-12"
                  disabled={callStatus !== "idle"}
                />
              </div>

              {callStatus !== "idle" && callStatus !== "ended" && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <div className={`h-3 w-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
                  <span className="font-medium">
                    {callStatus === "ringing" && "Ringing..."}
                    {callStatus === "ongoing" && `Call in progress: ${formatDuration(callDuration)}`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    className="h-12 text-lg"
                    onClick={() => setPhoneNumber((prev) => formatPhoneNumber(`${prev}${digit}`))}
                    disabled={callStatus !== "idle"}
                  >
                    {digit}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setPhoneNumber("")}
              disabled={callStatus !== "idle" || phoneNumber === ""}
            >
              Clear
            </Button>
            <Button 
              className="gap-2" 
              onClick={callStatus === "idle" ? handleCall : handleHangup} 
              disabled={callStatus === "idle" && phoneNumber === ""}
            >
              {callStatus === "idle" ? (
                <>
                  <Phone className="h-4 w-4" />
                  Call
                </>
              ) : (
                <>
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Your recent call history</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {callHistory.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{call.number}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>{call.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{call.duration}</Badge>
                      <Link href={`/calls/${call.id}`}>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Link href="/numbers" className="w-full">
              <Button variant="outline" className="w-full">
                View All Numbers
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
