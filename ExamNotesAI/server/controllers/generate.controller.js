import UserModel from "../models/user.model.js"
import {
  generateGeminiResponse,
  GeminiServiceError
} from "../services/gemini.services.js"
import { buildPrompt } from "../utils/promptBuilder.js"
import Notes from "../models/notes.model.js"
import { chargeCredits, refundCredits } from "../utils/credits.js"
import { normalizeNoteLanguage } from "../utils/noteLanguages.js"

const INVALID_TOPIC_MESSAGES = {
  off_topic: "That looks like a general query, not a study topic. Enter a subject, chapter, or academic concept to generate notes and quiz questions.",
  too_narrow: "That is too narrow for useful notes and quiz questions. Try a broader topic, such as “addition of integers” instead of “2+2”.",
  unclear: "I couldn't identify a clear study topic. Please rephrase it as a subject, chapter, or academic concept."
}
const STANDALONE_ARITHMETIC_PATTERN = /^[0-9\s()+*/×÷=.^%-]+$/u

const respondInsufficientCredits = async (req, res, user = null) => {
  const currentUser = user || await UserModel.findById(req.userId)
  if (!currentUser) {
    return res.status(400).json({ message: "user is not found" })
  }
  if (currentUser.credits < 10 && currentUser.isCreditAvailable) {
    await UserModel.updateOne(
      { _id: req.userId, credits: { $lt: 10 } },
      { $set: { isCreditAvailable: false } }
    )
  }
  return res.status(403).json({ message: "Insufficient credits" })
}

export const generateNotes = async (req, res) => {
  let chargedUser = null
  let createdNote = null

  try {
    const {
      topic,
      classLevel,
      examType,
      revisionMode = false,
      includeDiagram = false,
      includeChart = false,
      smartStudySections: requestedSmartStudySections,
      sourceText,
      language: requestedLanguage
    } = req.body;
    const language = normalizeNoteLanguage(requestedLanguage)
    const smartStudySections = typeof requestedSmartStudySections === "boolean"
      ? requestedSmartStudySections
      : true

    const normalizedTopic = typeof topic === "string" ? topic.trim() : ""
    if (!normalizedTopic) {
      return res.status(400).json({ message: "Topic is required" })
    }
    if (normalizedTopic.length > 300) {
      return res.status(400).json({
        message: "Topic must be 300 characters or fewer"
      })
    }
    if (STANDALONE_ARITHMETIC_PATTERN.test(normalizedTopic)) {
      return res.status(422).json({
        error: "Invalid study topic",
        message: INVALID_TOPIC_MESSAGES.too_narrow
      })
    }
    if (sourceText !== undefined &&
      (typeof sourceText !== "string" || sourceText.length > 15000)) {
      return res.status(400).json({
        message: "Source text must be a string of 15,000 characters or fewer"
      })
    }

    const creditUser = await UserModel.findById(req.userId)
    if (!creditUser) {
      return res.status(400).json({ message: "user is not found" })
    }
    if (creditUser.credits < 10) {
      return respondInsufficientCredits(req, res, creditUser)
    }

    const prompt = buildPrompt({
        topic: normalizedTopic,
        classLevel,
        examType,
        revisionMode,
        includeDiagram,
        includeChart,
        smartStudySections,
        sourceText,
        language
    });

    const generationResult = await generateGeminiResponse(prompt)
    if (
      !generationResult ||
      typeof generationResult !== "object" ||
      Array.isArray(generationResult)
    ) {
      return res.status(502).json({
        message: "We couldn't check that input. Please enter a clear study topic and try again."
      })
    }
    if (generationResult.status === "invalid") {
      const reason = Object.hasOwn(INVALID_TOPIC_MESSAGES, generationResult.reason)
        ? generationResult.reason
        : "unclear"
      return res.status(422).json({
        error: "Invalid study topic",
        message: INVALID_TOPIC_MESSAGES[reason]
      })
    }
    if (
      generationResult.status !== "valid" ||
      !generationResult.note ||
      typeof generationResult.note !== "object" ||
      Array.isArray(generationResult.note)
    ) {
      return res.status(502).json({
        message: "We couldn't check that input. Please enter a clear study topic and try again."
      })
    }

    chargedUser = await chargeCredits(req.userId, 10)
    if (!chargedUser) {
      return respondInsufficientCredits(req, res)
    }

    const aiResponse = generationResult.note
    normalizeExtraSections(aiResponse, smartStudySections)
    const generatedText = JSON.stringify(aiResponse)
    if (
      (language === "Hinglish" && /[\u0900-\u097f]/u.test(generatedText)) ||
      (language === "Hindi" && !/[\u0900-\u097f]/u.test(generatedText))
    ) {
      console.warn(`Generated note may not follow the requested ${language} script`)
    }

    createdNote = await Notes.create({
        user: chargedUser._id,
        topic: normalizedTopic,
        classLevel,
        examType,
        revisionMode,
        includeDiagram,
        includeChart,
        smartStudySections,
        language,
        hasSource: Boolean(sourceText?.trim()),
        content: aiResponse
    });

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.userId,
      { $addToSet: { notes: createdNote._id } },
      { new: true }
    )
    if (!updatedUser) {
      throw new Error("User is not found after creating notes")
    }
    if (updatedUser.credits <= 0) {
      await UserModel.updateOne(
        { _id: req.userId, credits: { $lte: 0 } },
        { $set: { isCreditAvailable: false } }
      )
    }

    return res.status(200).json({
        data: aiResponse,
        noteId: createdNote._id,
        creditsLeft: updatedUser.credits,
        language
    });

  } catch (error) {
    if (chargedUser) {
      if (createdNote) {
        try {
          await UserModel.updateOne(
            { _id: req.userId },
            { $pull: { notes: createdNote._id } }
          )
        } catch (cleanupError) {
          console.error("Failed to remove note reference:", cleanupError)
        }
        try {
          await Notes.deleteOne({ _id: createdNote._id, user: req.userId })
        } catch (cleanupError) {
          console.error("Failed to delete incomplete note:", cleanupError)
        }
      }

      try {
        const refundedUser = await refundCredits(req.userId, 10)
        if (!refundedUser) {
          console.error("Failed to refund credits: user is not found")
        }
      } catch (refundError) {
        console.error("Failed to refund credits:", refundError)
      }
    }
    console.error("FULL ERROR:", error.message, error.stack);
    if (error instanceof GeminiServiceError && error.status === 503) {
      return res.status(503).json({
        error: "AI service temporarily unavailable",
        message: "Notes could not be generated because the AI service is busy. Please try again in a minute."
      })
    }
    res.status(500).json({
      error: "AI generation failed",
      message: error.message
    });
  }
}

function normalizeExtraSections(content, enabled) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return

  if (!enabled) {
    delete content.extraSections
    return
  }

  const sections = content.extraSections
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    delete content.extraSections
    return
  }

  const normalized = {}
  const keyTerms = normalizeItems(sections.keyTerms, ["term", "meaning"], 10)
  if (keyTerms.length >= 4) normalized.keyTerms = keyTerms

  const example = sections.workedExample
  if (example && typeof example === "object" && !Array.isArray(example)) {
    const problem = cleanText(example.problem)
    const answer = cleanText(example.answer)
    const steps = Array.isArray(example.steps)
      ? example.steps.map(cleanText).filter(Boolean).slice(0, 8)
      : []
    if (problem && steps.length >= 2 && answer) {
      normalized.workedExample = {
        ...(cleanText(example.title) ? { title: cleanText(example.title) } : {}),
        problem,
        steps,
        answer
      }
    }
  }

  const commonMistakes = normalizeItems(
    sections.commonMistakes,
    ["mistake", "correction"],
    6
  )
  if (commonMistakes.length >= 2) normalized.commonMistakes = commonMistakes

  const mnemonics = normalizeItems(
    sections.mnemonics,
    ["title", "mnemonic", "explanation"],
    3
  )
  if (mnemonics.length) normalized.mnemonics = mnemonics

  if (Object.keys(normalized).length) {
    content.extraSections = normalized
  } else {
    delete content.extraSections
  }
}

function normalizeItems(items, fields, limit) {
  if (!Array.isArray(items)) return []

  return items.reduce((validItems, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return validItems
    const normalized = {}
    for (const field of fields) {
      const value = cleanText(item[field])
      if (!value) return validItems
      normalized[field] = value
    }
    validItems.push(normalized)
    return validItems
  }, []).slice(0, limit)
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : ""
}