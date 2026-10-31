import { useEffect, useRef, useState } from "react"
import {
  claimSpeechSession,
  cleanSpeechText,
  getDefaultSpeechVoice,
  getPreferredSpeechVoices,
  getSpeechChunk,
  isSpeechSynthesisSupported,
  releaseSpeechSession
} from "../utils/speechSynthesis"

function ReadAloudControl({ items, language }) {
  const supported = isSpeechSynthesisSupported()
  const [voices, setVoices] = useState([])
  const [voicesReady, setVoicesReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const generationRef = useRef(0)
  const sessionRef = useRef(null)
  const stopRef = useRef(() => {})
  const previousItemsRef = useRef(items)
  const previousLanguageRef = useRef(language)
  const playbackStateRef = useRef("idle")
  const cursorRef = useRef({ itemIndex: 0, offset: 0, text: "" })
  const currentChunkRef = useRef(null)

  const preferredVoices = getPreferredSpeechVoices(voices, language)
  const selectedVoice = getDefaultSpeechVoice(preferredVoices, language)

  const stop = (reset = true) => {
    generationRef.current += 1
    if (supported) window.speechSynthesis.cancel()
    playbackStateRef.current = "idle"
    setIsSpeaking(false)
    setIsPaused(false)
    currentChunkRef.current = null
    if (reset) cursorRef.current = { itemIndex: 0, offset: 0, text: "" }
    releaseSpeechSession(sessionRef.current)
  }

  useEffect(() => {
    stopRef.current = stop
  })

  useEffect(() => {
    if (!supported) return undefined

    const refreshVoices = () => {
      setVoices(window.speechSynthesis.getVoices())
      setVoicesReady(true)
    }

    refreshVoices()
    const supportsVoiceEvents = typeof window.speechSynthesis.addEventListener === "function"
    if (supportsVoiceEvents) {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices)
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices
    }
    const timer = window.setTimeout(refreshVoices, 500)

    return () => {
      window.clearTimeout(timer)
      if (supportsVoiceEvents) {
        window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices)
      } else if (window.speechSynthesis.onvoiceschanged === refreshVoices) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [supported])

  useEffect(() => {
    if (!supported) return undefined
    const stopOnPageLeave = () => stopRef.current()
    window.addEventListener("pagehide", stopOnPageLeave)
    return () => {
      window.removeEventListener("pagehide", stopOnPageLeave)
      if (playbackStateRef.current !== "idle") stopRef.current()
    }
  }, [supported])

  useEffect(() => {
    if (previousItemsRef.current !== items || previousLanguageRef.current !== language) {
      stopRef.current()
      previousItemsRef.current = items
      previousLanguageRef.current = language
    }
  }, [items, language])

  const play = () => {
    const voice = selectedVoice
    if (!supported || !voice || !items.length) return

    const session = sessionRef.current || { stop: () => stopRef.current() }
    sessionRef.current = session
    claimSpeechSession(session)
    window.speechSynthesis.cancel()
    generationRef.current += 1
    const generation = generationRef.current
    setErrorMessage("")
    playbackStateRef.current = "playing"
    setIsSpeaking(true)
    setIsPaused(false)

    const speakNextChunk = () => {
      if (generation !== generationRef.current) return

      while (cursorRef.current.itemIndex < items.length) {
        const cursor = cursorRef.current
        if (!cursor.text) cursor.text = cleanSpeechText(items[cursor.itemIndex])
        const chunk = getSpeechChunk(cursor.text, cursor.offset)
        if (chunk) {
          currentChunkRef.current = {
            itemIndex: cursor.itemIndex,
            startOffset: cursor.offset,
            spokenOffset: 0
          }
          cursor.offset = chunk.nextOffset
          const utterance = new window.SpeechSynthesisUtterance(chunk.text)
          utterance.voice = voice
          utterance.lang = voice.lang || "en"
          utterance.onboundary = (event) => {
            if (
              generation === generationRef.current &&
              currentChunkRef.current?.itemIndex === cursor.itemIndex &&
              Number.isInteger(event.charIndex)
            ) {
              currentChunkRef.current.spokenOffset = event.charIndex
            }
          }
          utterance.onend = () => {
            if (generation === generationRef.current) speakNextChunk()
          }
          utterance.onerror = (event) => {
            if (generation !== generationRef.current) return
            const interrupted = event.error === "interrupted" || event.error === "canceled"
            stopRef.current()
            if (!interrupted) setErrorMessage("Speech could not be played on this device.")
          }
          window.speechSynthesis.speak(utterance)
          return
        }

        cursor.itemIndex += 1
        cursor.offset = 0
        cursor.text = ""
      }

      playbackStateRef.current = "idle"
      setIsSpeaking(false)
      setIsPaused(false)
      cursorRef.current = { itemIndex: 0, offset: 0, text: "" }
      currentChunkRef.current = null
      releaseSpeechSession(sessionRef.current)
    }

    speakNextChunk()
  }

  const pauseOrResume = () => {
    if (playbackStateRef.current === "playing") {
      const currentChunk = currentChunkRef.current
      if (currentChunk) {
        cursorRef.current = {
          ...cursorRef.current,
          itemIndex: currentChunk.itemIndex,
          offset: currentChunk.startOffset + currentChunk.spokenOffset
        }
      }
      generationRef.current += 1
      window.speechSynthesis.cancel()
      playbackStateRef.current = "paused"
      setIsSpeaking(false)
      setIsPaused(true)
      currentChunkRef.current = null
      return
    }

    if (playbackStateRef.current === "paused") {
      play()
    }
  }

  const restart = () => {
    if (playbackStateRef.current !== "idle") stop(false)
    cursorRef.current = { itemIndex: 0, offset: 0, text: "" }
    play()
  }

  if (!supported) return null

  const noVoice = voicesReady && !selectedVoice

  return (
    <div className="print:hidden flex items-center gap-1">
      <button
        type="button"
        onClick={play}
        disabled={!items.length || !selectedVoice || isSpeaking}
        aria-label="Read detailed notes aloud"
        title="Read detailed notes aloud"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-lg text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">🔊</span>
      </button>
      <button
        type="button"
        onClick={pauseOrResume}
        disabled={!isSpeaking && !isPaused}
        aria-label={isPaused ? "Resume reading detailed notes" : "Pause reading detailed notes"}
        title={isPaused ? "Resume" : "Pause"}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-gray-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">{isPaused ? "▶" : "Ⅱ"}</span>
      </button>
      <button
        type="button"
        onClick={restart}
        disabled={!items.length || !selectedVoice}
        aria-label="Restart reading from the beginning"
        title="Restart from beginning"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-gray-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">↻</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {isSpeaking ? "Reading detailed notes" : isPaused ? "Reading paused" : "Detailed notes reader stopped"}
      </span>
      {noVoice && (
        <p role="status" className="mt-2 text-sm text-amber-800">
          {language === "Hindi" ? "No Hindi voice found on this device." : "No suitable voice found on this device."}
          {" "}Try installing a voice in your device&apos;s language or speech settings, or try Chrome on Android, Edge, or Safari. You can also generate the note in Hinglish or English.
        </p>
      )}
      {errorMessage && <p role="status" className="mt-2 text-sm text-red-700">{errorMessage}</p>}
    </div>
  )
}

export default ReadAloudControl
