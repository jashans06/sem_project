import { SPEECH_LANGUAGE_PREFERENCES } from "./noteLanguages"

let activeSession = null

export const isSpeechSynthesisSupported = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.SpeechSynthesisUtterance === "function"

export const claimSpeechSession = (session) => {
  if (activeSession && activeSession !== session) {
    activeSession.stop()
  }
  activeSession = session
}

export const releaseSpeechSession = (session) => {
  if (activeSession === session) activeSession = null
}

export const cleanSpeechText = (value) => {
  if (typeof value !== "string") return ""

  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, " ")
    .replace(/^\s*[-*_]{3,}\s*$/gm, " ")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/(?:<[-=]+|[-=]+>)/g, " ")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, " ")
    .replace(/[|`*_~>#]/g, " ")
    .replace(/[\u2190-\u21FF\u2500-\u259F\u25A0-\u25FF\u2605-\u2606\u2726-\u273F\u2B50]/g, " ")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const getSpeechChunk = (text, offset, maxLength = 180) => {
  if (offset >= text.length) return null

  const end = Math.min(offset + maxLength, text.length)
  if (end === text.length) return { text: text.slice(offset).trim(), nextOffset: end }

  const segment = text.slice(offset, end)
  const sentenceEnd = Math.max(
    segment.lastIndexOf(". "),
    segment.lastIndexOf("? "),
    segment.lastIndexOf("! "),
    segment.lastIndexOf("। "),
    segment.lastIndexOf("॥ ")
  )
  let splitAt = sentenceEnd >= Math.floor(maxLength * 0.55) ? sentenceEnd + 1 : -1

  if (splitAt < 0) splitAt = segment.lastIndexOf(" ")
  if (splitAt <= 0) splitAt = maxLength

  const chunk = text.slice(offset, offset + splitAt).trim()
  const nextOffset = offset + splitAt
  return chunk
    ? { text: chunk, nextOffset }
    : getSpeechChunk(text, nextOffset, maxLength)
}

const matchesLanguage = (voice, language) =>
  voice.lang?.toLowerCase().startsWith(`${language}-`) ||
  voice.lang?.toLowerCase() === language

export const getPreferredSpeechVoices = (voices, language) => {
  const families = SPEECH_LANGUAGE_PREFERENCES[language]?.voiceFamilies || ["en"]
  return voices.filter((voice) =>
    families.some((family) => matchesLanguage(voice, family))
  )
}

export const getDefaultSpeechVoice = (voices, language) => {
  try {
    const savedPreferences = JSON.parse(
      window.localStorage.getItem(`examEnAi.readAloud.${language}`) || "{}"
    )
    const rememberedVoice = voices.find(
      (voice) => voice.name === savedPreferences.voiceName
    )
    if (rememberedVoice) return rememberedVoice
  } catch {
    // Browser storage may be unavailable.
  }

  const allEnglish = voices.filter((voice) => matchesLanguage(voice, "en"))
  const allHindi = voices.filter((voice) => matchesLanguage(voice, "hi"))
  const exact = (list, tag) => list.filter((voice) => voice.lang?.toLowerCase() === tag)
  let groups

  if (language === "Hindi") {
    groups = [exact(allHindi, "hi-in"), allHindi]
  } else if (language === "Hinglish") {
    groups = [
      exact(allEnglish, "en-in"),
      exact(allHindi, "hi-in"),
      allEnglish,
      allHindi
    ]
  } else {
    groups = [
      exact(allEnglish, "en-in"),
      exact(allEnglish, "en-gb"),
      allEnglish
    ]
  }

  const femaleNameHints = [
    "female", "woman", "samantha", "victoria", "karen", "moira", "tessa",
    "serena", "susan", "zira", "hazel", "ava", "allison", "siri female",
    "aditi", "swara", "kalpana", "heera", "neerja", "raveena", "veena",
    "lekha", "priya", "kavya"
  ]
  const isLikelyFemale = (voice) => {
    const name = (voice.name || "").toLowerCase()
    return femaleNameHints.some((hint) => name.includes(hint))
  }

  for (const group of groups) {
    const femaleVoice = group.find(isLikelyFemale)
    if (femaleVoice) return femaleVoice
  }

  return groups.find((group) => group.length)?.[0] || null
}
