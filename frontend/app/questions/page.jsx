"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { API_URL } from "@/config"

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([])
  const [newQuestion, setNewQuestion] = useState("")

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/questions`)
      const data = await response.json()
      setQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const addQuestion = async () => {
    if (!newQuestion.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newQuestion }),
      })

      if (response.ok) {
        setNewQuestion("")
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error adding question:", error)
    }
  }

  const deleteQuestion = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/questions/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error deleting question:", error)
    }
  }

  const moveQuestion = async (id, direction) => {
    try {
      const response = await fetch(`${API_URL}/api/questions/${id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      })

      if (response.ok) {
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error moving question:", error)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Call Analysis Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Enter a new question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addQuestion()}
            />
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1">{question.text}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveQuestion(question.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveQuestion(question.id, "down")}
                    disabled={index === questions.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 