"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Download, FileText, Headphones, Pause, Play, Phone, User } from "lucide-react"

export default function CallDetailsPage() {
  const params = useParams()
  const id = params.id

  const [activeTab, setActiveTab] = useState("all")
  const [isPlaying, setIsPlaying] = useState({})
  const [answers, setAnswers] = useState({})

  // Mock data for the selected number
  const numberDetails = {
    id: Number.parseInt(id),
    number: "+1 (555) 123-4567",
    label: "Sales Team",
    callCount: 42,
    lastCalled: "June 15, 2023",
  }

  // Mock call recordings data
  const callRecordings = [
    {
      id: 1,
      date: "June 15, 2023",
      time: "10:30 AM",
      duration: "5:23",
      transcription:
        "Hello, this is John from Acme Corp. I'm calling about your recent inquiry about our premium services. We have a special offer this month that I think would be perfect for your needs. Would you like to hear more about it?",
      questions: [
        "What was the customer's main concern?",
        "Did they express interest in the special offer?",
        "What follow-up actions were agreed upon?",
      ],
      audioUrl: "/recording1.mp3",
    },
    {
      id: 2,
      date: "June 14, 2023",
      time: "2:45 PM",
      duration: "8:12",
      transcription:
        "Hi there, I'm calling from the sales department at Acme Corp. I noticed you downloaded our whitepaper on cloud solutions. I wanted to follow up and see if you had any questions about implementing our technology in your business. We've helped several companies in your industry achieve significant cost savings.",
      questions: [
        "What specific industry was mentioned?",
        "What pain points did the customer mention?",
        "What solutions were discussed during the call?",
      ],
      audioUrl: "/recording2.mp3",
    },
    {
      id: 3,
      date: "June 12, 2023",
      time: "11:15 AM",
      duration: "3:47",
      transcription:
        "Good morning, this is Sarah from Acme Corp's customer success team. I'm calling to check in on your recent implementation. How has your experience been so far? Have you been able to use all the features we discussed during onboarding?",
      questions: [
        "What features were mentioned during the call?",
        "Were there any issues reported by the customer?",
        "What was the overall satisfaction level expressed?",
      ],
      audioUrl: "/recording3.mp3",
    },
  ]

  const handlePlayPause = (recordingId) => {
    setIsPlaying((prev) => ({
      ...prev,
      [recordingId]: !prev[recordingId],
    }))
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

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold">Call Details & Transcriptions</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{numberDetails.number}</span>
          <span className="text-sm">({numberDetails.label})</span>
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
              <div className="text-2xl font-bold">{numberDetails.callCount}</div>
            </div>
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Last Called</div>
              <div className="text-2xl font-bold">{numberDetails.lastCalled}</div>
            </div>
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Average Duration</div>
              <div className="text-2xl font-bold">5:47</div>
            </div>
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Call Success Rate</div>
              <div className="text-2xl font-bold">87%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Call Recordings & Transcriptions</CardTitle>
          <CardDescription>Listen to call recordings and view transcriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Calls</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-6">
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No call recordings found for the selected time period
              </div>
            ) : (
              filteredRecordings.map((recording) => (
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
                      </div>
                      <div className="flex items-center gap-2">
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
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">Transcription</h4>
                        </div>
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <p>{recording.transcription}</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">Call Analysis Questions</h4>
                        </div>
                        <div className="space-y-4">
                          {recording.questions.map((question, index) => (
                            <div key={index} className="space-y-2">
                              <p className="text-sm font-medium">{question}</p>
                              <Textarea
                                placeholder="Enter your answer..."
                                value={answers[`${recording.id}-${index}`] || ""}
                                onChange={(e) => handleAnswerChange(recording.id, index, e.target.value)}
                              />
                            </div>
                          ))}
                          <Button className="mt-2">Save Answers</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
