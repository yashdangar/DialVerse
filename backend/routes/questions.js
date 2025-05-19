import express from "express"
import { PrismaClient } from "@prisma/client"
const router = express.Router()
const prisma = new PrismaClient()

// Get all questions
router.get("/", async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      orderBy: {
        order: "asc",
      },
    })
    res.json(questions)
  } catch (error) {
    console.error("Error fetching questions:", error)
    res.status(500).json({ error: "Failed to fetch questions" })
  }
})

// Create a new question
router.post("/", async (req, res) => {
  try {
    const { text } = req.body

    // Get the highest order number
    const lastQuestion = await prisma.question.findFirst({
      orderBy: {
        order: "desc",
      },
    })

    const newOrder = lastQuestion ? lastQuestion.order + 1 : 0

    const question = await prisma.question.create({
      data: {
        text,
        order: newOrder,
      },
    })

    res.json(question)
  } catch (error) {
    console.error("Error creating question:", error)
    res.status(500).json({ error: "Failed to create question" })
  }
})

// Delete a question
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    await prisma.question.delete({
      where: { id },
    })

    res.json({ message: "Question deleted successfully" })
  } catch (error) {
    console.error("Error deleting question:", error)
    res.status(500).json({ error: "Failed to delete question" })
  }
})

// Move a question up or down
router.post("/:id/move", async (req, res) => {
  try {
    const { id } = req.params
    const { direction } = req.body

    const question = await prisma.question.findUnique({
      where: { id },
    })

    if (!question) {
      return res.status(404).json({ error: "Question not found" })
    }

    const questions = await prisma.question.findMany({
      orderBy: {
        order: "asc",
      },
    })

    const currentIndex = questions.findIndex((q) => q.id === id)
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= questions.length) {
      return res.status(400).json({ error: "Cannot move question further" })
    }

    const targetQuestion = questions[newIndex]

    // Swap orders
    await prisma.question.update({
      where: { id },
      data: { order: targetQuestion.order },
    })

    await prisma.question.update({
      where: { id: targetQuestion.id },
      data: { order: question.order },
    })

    res.json({ message: "Question moved successfully" })
  } catch (error) {
    console.error("Error moving question:", error)
    res.status(500).json({ error: "Failed to move question" })
  }
})

export default router 