"use client"

import { useState, useCallback, useRef } from "react"

export function useCall() {
  const [callStatus, setCallStatus] = useState("idle") // "idle" | "ringing" | "ongoing" | "ended"
  const [callDuration, setCallDuration] = useState(0)
  const intervalRef = useRef(null)

  const startCall = useCallback(
    (phoneNumber) => {
      if (!phoneNumber || callStatus !== "idle") return false

      setCallStatus("ringing")

      // Simulate call connection after 2 seconds
      setTimeout(() => {
        setCallStatus("ongoing")

        // Start call duration timer
        intervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
      }, 2000)

      return true
    },
    [callStatus],
  )

  const endCall = useCallback(() => {
    if (callStatus !== "ongoing" && callStatus !== "ringing") return false

    // Clear interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setCallStatus("ended")

    // Reset after 2 seconds
    setTimeout(() => {
      setCallStatus("idle")
      setCallDuration(0)
    }, 2000)

    return true
  }, [callStatus])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return {
    callStatus,
    callDuration,
    startCall,
    endCall,
    formattedDuration: formatDuration(callDuration),
  }
}
