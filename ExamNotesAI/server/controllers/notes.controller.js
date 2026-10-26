import Notes from "../models/notes.model.js"
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