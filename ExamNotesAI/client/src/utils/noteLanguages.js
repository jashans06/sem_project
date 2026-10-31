export const NOTE_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिन्दी (Hindi)" },
  { value: "Hinglish", label: "Hinglish (Hindi in English letters)" }
]

export const DEFAULT_NOTE_LANGUAGE = "English"
export const NOTE_LANGUAGE_STORAGE_KEY = "examEnAi.notesLanguage"

export const SPEECH_LANGUAGE_PREFERENCES = {
  English: {
    preferredTags: ["en-IN", "en-GB"],
    voiceFamilies: ["en"]
  },
  Hindi: {
    preferredTags: ["hi-IN"],
    voiceFamilies: ["hi"]
  },
  Hinglish: {
    preferredTags: ["en-IN", "hi-IN"],
    voiceFamilies: ["en", "hi"]
  }
}

export const isNoteLanguage = (value) =>
  NOTE_LANGUAGES.some((language) => language.value === value)

export const getRememberedNoteLanguage = () => {
  try {
    const value = window.localStorage.getItem(NOTE_LANGUAGE_STORAGE_KEY)
    return isNoteLanguage(value) ? value : DEFAULT_NOTE_LANGUAGE
  } catch {
    return DEFAULT_NOTE_LANGUAGE
  }
}

export const rememberNoteLanguage = (value) => {
  try {
    if (isNoteLanguage(value)) {
      window.localStorage.setItem(NOTE_LANGUAGE_STORAGE_KEY, value)
    }
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

export const getNoteLanguageLabel = (value) =>
  NOTE_LANGUAGES.find((language) => language.value === value)?.label ??
  NOTE_LANGUAGES[0].label
