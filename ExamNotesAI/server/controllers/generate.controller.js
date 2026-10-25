import UserModel from "../models/user.model.js"
import { generateGeminiResponse } from "../services/gemini.services.js"
import { buildPrompt } from "../utils/promptBuilder.js"
import Notes from "../models/notes.model.js"
import { chargeCredits, refundCredits } from "../utils/credits.js"

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
      sourceText
    } = req.body;

    if(!topic){
      return res.status(400).json({message:"Topic is required"})
    }
    if (sourceText !== undefined &&
      (typeof sourceText !== "string" || sourceText.length > 15000)) {
      return res.status(400).json({
        message: "Source text must be a string of 15,000 characters or fewer"
      })
    }

    chargedUser = await chargeCredits(req.userId, 10)
    if (!chargedUser) {
      const user = await UserModel.findById(req.userId)
      if (!user) {
        return res.status(400).json({message:"user is not found"})
      }
      if (user.credits < 10 && user.isCreditAvailable) {
        await UserModel.updateOne(
          { _id: req.userId, credits: { $lt: 10 } },
          { $set: { isCreditAvailable: false } }
        )
      }
      return res.status(403).json({
        message: "Insufficient credits"
      });
    }

    const prompt = buildPrompt({
        topic,
        classLevel,
        examType,
        revisionMode,
        includeDiagram,
        includeChart,
        sourceText
    });

    const aiResponse = await generateGeminiResponse(prompt);

    createdNote = await Notes.create({
        user: chargedUser._id,
        topic,
        classLevel,
        examType,
        revisionMode,
        includeDiagram,
        includeChart,
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
        creditsLeft: updatedUser.credits
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
    console.error("FULL ERROR:", error.message, error.stack);  // ← changed
    res.status(500).json({
      error: "AI generation failed",
      message: error.message
    });
  }
}