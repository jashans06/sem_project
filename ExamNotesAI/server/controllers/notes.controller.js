import mongoose from "mongoose"
import Notes from "../models/notes.model.js"
import UserModel from "../models/user.model.js"
import {
  DEFAULT_NOTE_LANGUAGE,
  normalizeNoteLanguage
} from "../utils/noteLanguages.js"

export const getMyNotes = async (req,res) => {
  try {
    const notes = await Notes.find({user : req.userId}).select("topic classLevel examType language revisionMode includeDiagram includeChart hasSource createdAt").sort({createdAt: -1})
    if (!notes) {
      return res.status(404).json({
        error: "Notes not found"
      });
    }
    return res.status(200).json(notes.map((note) => ({
      ...note.toObject(),
      language: normalizeNoteLanguage(note.language)
    })))
  } catch (error) {
    return res.status(500).json({message:`getCurrentUser notes error ${error}`})
  }
}

export const getSingleNotes = async (req,res) => {
  try {
    const notes = await Notes.findOne({
      _id:req.params.id,
      user: req.userId
    })
    if (!notes) {
      return res.status(404).json({
        error: "Notes not found"
      });
    }
    return res.json({
        _id: notes._id,
        content: notes.content,
        topic: notes.topic,
        classLevel: notes.classLevel,
        examType: notes.examType,
        language: normalizeNoteLanguage(notes.language || DEFAULT_NOTE_LANGUAGE),
        createdAt: notes.createdAt,
        hasSource: notes.hasSource,
        extras: notes.extras ?? {}
    })
  } catch (error) {
    return res.status(500).json({message:`getSingle notes error ${error}`})

  }
}

export const deleteNote = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(404).json({ message: "Note not found" })
    }

    const deletedNote = await Notes.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    })
    if (!deletedNote) {
      return res.status(404).json({ message: "Note not found" })
    }

    await UserModel.updateOne(
      { _id: req.userId },
      { $pull: { notes: deletedNote._id } }
    )

    return res.status(200).json({
      message: "Note deleted successfully",
      deletedId: deletedNote._id
    })
  } catch (error) {
    return res.status(500).json({ message: `deleteNote error ${error}` })
  }
}

export const updateNoteText = async (req, res) => {
  try {
    const notes = req.body?.notes
    if (typeof notes !== "string" || !notes.trim() || notes.length > 20000) {
      return res.status(400).json({
        message: "Notes must be non-empty text of at most 20,000 characters"
      })
    }
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(404).json({ message: "Note not found" })
    }

    const updatedNote = await Notes.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { "content.notes": notes } },
      { new: true }
    )
    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" })
    }

    return res.status(200).json({ notes: updatedNote.content.notes })
  } catch (error) {
    return res.status(500).json({ message: `updateNoteText error ${error}` })
  }
}