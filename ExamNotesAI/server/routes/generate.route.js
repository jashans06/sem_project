import express from "express"
import isAuth from "../middleware/isAuth.js";
import { generateNotes } from "../controllers/generate.controller.js";
import { getMyNotes, getSingleNotes } from "../controllers/notes.controller.js";
import { generateNoteExtra, saveQuizAttempt } from "../controllers/extras.controller.js";

const notesRouter = express.Router()

notesRouter.post("/generate-notes", isAuth, generateNotes);
notesRouter.get("/getnotes", isAuth, getMyNotes);
notesRouter.post("/:id/extras", isAuth, generateNoteExtra);
notesRouter.post("/:id/quiz-attempt", isAuth, saveQuizAttempt);
notesRouter.get("/:id", isAuth, getSingleNotes);

export default notesRouter