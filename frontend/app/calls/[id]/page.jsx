"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Download, FileText, Headphones, Pause, Play, Phone, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { API_URL } from "@/config"

export default function CallDetailsPage() {
  const params = useParams()
  const id = params.id
  const audioRefs = useRef({})

  const [activeTab, setActiveTab] = useState("all")
  const [isPlaying, setIsPlaying] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [numberDetails, setNumberDetails] = useState(null)
  const [callRecordings, setCallRecordings] = useState([])

  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        const response = await fetch(`${API_URL}/api/phone-numbers/${id}/calls`)
        if (!response.ok) {
          throw new Error('Failed to fetch call details')
        }

        const data = await response.json()
        console.log('Fetched data:', data)
        console.log('Call recordings:', data.callRecordings)
        console.log('First recording questions:', data.callRecordings[0]?.questions)
        setNumberDetails(data.numberDetails)
        setCallRecordings(data.callRecordings)
      } catch (err) {
        console.error('Error fetching call details:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCallDetails()
  }, [id])

  const handlePlayPause = (recordingId) => {
    const audio = audioRefs.current[recordingId]
    if (!audio) return

    if (isPlaying[recordingId]) {
      audio.pause()
    } else {
      // Pause all other playing audio
      Object.keys(isPlaying).forEach(id => {
        if (isPlaying[id] && id !== recordingId) {
          audioRefs.current[id]?.pause()
          setIsPlaying(prev => ({ ...prev, [id]: false }))
        }
      })
      audio.play()
    }
    setIsPlaying(prev => ({ ...prev, [recordingId]: !prev[recordingId] }))
  }

  const handleAudioEnded = (recordingId) => {
    setIsPlaying(prev => ({ ...prev, [recordingId]: false }))
  }

  const handleDownload = async (recordingId) => {
    if (!recordingId) {
      console.error('No recording ID available');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/recordings/${recordingId}`)
      if (!response.ok) {
        throw new Error('Failed to download recording')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-${recordingId}.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading recording:', error)
    }
  }

  const handleAnswerChange = (recordingId, questionIndex, value) => {
    const key = `${recordingId}-${questionIndex}`
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const filteredRecordings =
    activeTab === "all"
      ? callRecordings
      : callRecordings.filter((recording) => {
          const recordingDate = new Date(recording.date)
          const today = new Date()

          if (activeTab === "today") {
            return recordingDate.toDateString() === today.toDateString()
          } else if (activeTab === "week") {
            const weekAgo = new Date()
            weekAgo.setDate(today.getDate() - 7)
            return recordingDate >= weekAgo
          } else if (activeTab === "month") {
            const monthAgo = new Date()
            monthAgo.setMonth(today.getMonth() - 1)
            return recordingDate >= monthAgo
          }

          return true
        })

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!numberDetails || callRecordings.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Calls Found</CardTitle>
            <CardDescription>There are no calls recorded for this number.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold">Call Details & Transcriptions</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{numberDetails?.number}</span>
        </div>
      </div>

      <Card className="shadow-md mb-8">
        <CardHeader>
          <CardTitle>Call Summary</CardTitle>
          <CardDescription>Overview of call activity for this number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total Calls</div>
              <div className="text-2xl font-bold">{numberDetails?.callCount}</div>
            </div>
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Last Called</div>
              <div className="text-2xl font-bold">{numberDetails?.lastCalled}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Call Recordings & Analysis</CardTitle>
          <CardDescription>Listen to call recordings and view transcriptions with analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {callRecordings.map((recording) => (
              <Card key={recording.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {recording.date}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {recording.time}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Headphones className="h-3 w-3" />
                        {recording.duration}
                      </Badge>
                      <Badge variant={recording.direction?.toUpperCase() === 'INBOUND' ? 'default' : 'secondary'} className="gap-1">
                        {recording.direction?.toUpperCase() === 'INBOUND' ? 'Inbound' : 'Outbound'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {recording.recordingId && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handlePlayPause(recording.id)}
                          >
                            {isPlaying[recording.id] ? (
                              <>
                                <Pause className="h-3 w-3" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                Play
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleDownload(recording.recordingId)}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-6">
                    {recording.recordingId && (
                      <div className="mb-4">
                        <audio
                          ref={el => audioRefs.current[recording.id] = el}
                          src={`${API_URL}/api/recordings/${recording.recordingId}`}
                          onEnded={() => handleAudioEnded(recording.id)}
                          className="w-full"
                        />
                      </div>
                    )}

                    {recording.transcription && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">Transcription</h4>
                        </div>
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <p className="whitespace-pre-wrap">{recording.transcription}</p>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">Call Analysis</h4>
                      </div>
                      <div className="space-y-6">
                        {recording.questions && recording.questions.length > 0 ? (
                          recording.questions.map((question) => (
                            <div key={question.id} className="space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm mb-1">{question.text}</p>
                                  <div className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-sm text-muted-foreground">
                                      {question.answer || "No answer available"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No questions analyzed for this call
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
