import Notes from "../models/notes.model.js"
import { generateGeminiResponse } from "../services/gemini.services.js"
import { chargeCredits, refundCredits } from "../utils/credits.js"
import {
  buildFlashcardsPrompt,
  buildQuizPrompt,
  buildModelAnswersPrompt
} from "../utils/extraPrompts.js"

const EXTRA_COSTS = {
  flashcards: 3,
  quiz: 5,
  modelAnswers: 5
}

const EXTRA_PROMPTS = {
  flashcards: buildFlashcardsPrompt,
  quiz: buildQuizPrompt,
  modelAnswers: buildModelAnswersPrompt
}

const validateExtra = (type, data, content) => {
  if (!Array.isArray(data)) return false

  if (type === "flashcards") {
    return data.length >= 12 && data.length <= 15 &&
      data.every((item) =>
        typeof item.front === "string" &&
        typeof item.back === "string" &&
        typeof item.topic === "string"
      )
  }

  if (type === "quiz") {
    const topics = Object.values(content.subTopics || {}).flat()
    return data.length === 10 &&
      data.every((item) =>
        typeof item.question === "string" &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        item.options.every((option) => typeof option === "string") &&
        Number.isInteger(item.correctIndex) &&
        item.correctIndex >= 0 &&
        item.correctIndex < 4 &&
        typeof item.explanation === "string" &&
        topics.includes(item.topic)
      )
  }

  const longQuestions = content.questions?.long
  return Array.isArray(longQuestions) &&
    data.length === longQuestions.length &&
    data.every((item, index) => {
      const wordCount = typeof item.answer === "string"
        ? item.answer.trim().split(/\s+/).filter(Boolean).length
        : 0
      return item.question === longQuestions[index] &&
        wordCount >= 150 &&
        wordCount <= 250
    })
}

export const generateNoteExtra = async (req, res) => {
  const { type, newSet = false } = req.body ?? {}
  if (!Object.hasOwn(EXTRA_COSTS, type)) {
    return res.status(400).json({ message: "Invalid extra type" })
  }
  if (typeof newSet !== "boolean") {
    return res.status(400).json({ message: "Invalid quiz set request" })
  }
  if (type !== "quiz" && newSet) {
    return res.status(400).json({ message: "Only quizzes can have additional sets" })
  }

  let chargedUser = null
  try {
    const note = await Notes.findOne({ _id: req.params.id, user: req.userId })
    if (!note) {
      return res.status(404).json({ message: "Notes not found" })
    }

    const quizSets = Array.isArray(note.extras?.quizSets) && note.extras.quizSets.length
      ? note.extras.quizSets
      : note.extras?.quiz
        ? [note.extras.quiz]
        : []

    if (type === "quiz" && quizSets.length && !newSet) {
      return res.status(200).json({
        data: quizSets[quizSets.length - 1],
        quizSets,
        cached: true
      })
    }

    if (type !== "quiz" && note.extras?.[type]) {
      return res.status(200).json({
        data: note.extras[type],
        cached: true
      })
    }

    if (
      type === "modelAnswers" &&
      !note.content.questions?.long?.length
    ) {
      return res.status(400).json({ message: "No long questions are available for model answers" })
    }

    const cost = type === "quiz" && newSet && quizSets.length === 1
      ? 0
      : EXTRA_COSTS[type]
    if (cost > 0) {
      chargedUser = await chargeCredits(req.userId, cost)
      if (!chargedUser) {
        return res.status(403).json({ message: "Insufficient credits" })
      }
    }

    const data = await generateGeminiResponse(EXTRA_PROMPTS[type](note.content))
    if (!validateExtra(type, data, note.content)) {
      throw new Error(`Gemini returned invalid ${type} data`)
    }

    let update
    if (type === "quiz") {
      const query = { _id: note._id, user: req.userId }
      const changes = { $push: { "extras.quizSets": data } }

      if (quizSets.length === 0) {
        query["extras.quizSets"] = Array.isArray(note.extras?.quizSets)
          ? { $size: 0 }
          : { $exists: false }
        query["extras.quiz"] = { $exists: false }
        changes.$set = { "extras.quiz": data }
      } else if (!Array.isArray(note.extras?.quizSets) || note.extras.quizSets.length === 0) {
        query["extras.quizSets"] = Array.isArray(note.extras?.quizSets)
          ? { $size: 0 }
          : { $exists: false }
        changes.$set = { "extras.quizSets": [...quizSets, data] }
        delete changes.$push
      } else {
        query["extras.quizSets"] = { $size: quizSets.length }
      }

      update = await Notes.updateOne(query, changes)
    } else {
      update = await Notes.updateOne(
        { _id: note._id, user: req.userId, [`extras.${type}`]: { $exists: false } },
        { $set: { [`extras.${type}`]: data } }
      )
    }

    if (update.matchedCount === 0) {
      const savedNote = await Notes.findOne({ _id: note._id, user: req.userId })
      const savedQuizSets = Array.isArray(savedNote?.extras?.quizSets) && savedNote.extras.quizSets.length
        ? savedNote.extras.quizSets
        : savedNote?.extras?.quiz
          ? [savedNote.extras.quiz]
          : []
      const cachedData = type === "quiz"
        ? savedQuizSets[savedQuizSets.length - 1]
        : savedNote?.extras?.[type]
      if (!cachedData) {
        throw new Error("Unable to save generated extra")
      }
      if (chargedUser) {
        const refundedUser = await refundCredits(req.userId, cost)
        if (!refundedUser) {
          throw new Error("Unable to refund duplicate extra-generation charge")
        }
        chargedUser = null
        return res.status(200).json({
          data: cachedData,
          quizSets: type === "quiz" ? savedQuizSets : undefined,
          creditsLeft: refundedUser.credits,
          cached: true
        })
      }
      return res.status(200).json({
        data: cachedData,
        quizSets: type === "quiz" ? savedQuizSets : undefined,
        cached: true
      })
    }

    return res.status(200).json({
      data,
      ...(type === "quiz" ? { quizSets: [...quizSets, data] } : {}),
      ...(chargedUser ? { creditsLeft: chargedUser.credits } : {})
    })
  } catch (error) {
    if (chargedUser) {
      try {
        const refundedUser = await refundCredits(req.userId, EXTRA_COSTS[type])
        if (!refundedUser) {
          console.error("Failed to refund extra-generation credits: user is not found")
        }
      } catch (refundError) {
        console.error("Failed to refund extra-generation credits:", refundError)
      }
    }
    console.error("Note extra generation failed:", error)
    return res.status(500).json({ message: "Unable to generate study extra" })
  }
}

export const saveQuizAttempt = async (req, res) => {
  const { score, total, wrongTopics } = req.body ?? {}
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    total < 1 ||
    score < 0 ||
    score > total ||
    !Array.isArray(wrongTopics) ||
    !wrongTopics.every((topic) => typeof topic === "string")
  ) {
    return res.status(400).json({ message: "Invalid quiz attempt" })
  }

  try {
    const note = await Notes.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        $push: {
          quizAttempts: { score, total, wrongTopics, takenAt: new Date() }
        }
      },
      { new: true }
    )
    if (!note) {
      return res.status(404).json({ message: "Notes not found" })
    }
    return res.status(200).json({ message: "Quiz attempt saved" })
  } catch (error) {
    console.error("Quiz attempt save failed:", error)
    return res.status(500).json({ message: "Unable to save quiz attempt" })
  }
}
