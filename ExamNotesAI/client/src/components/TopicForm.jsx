import React, { useState, useEffect  } from "react"
import { motion } from "motion/react"
import { FiChevronDown } from "react-icons/fi"
import * as pdfjsLib from "pdfjs-dist"
import { generateNotes } from "../services/api"
import { useDispatch } from "react-redux";
import { updateCredits } from "../redux/userSlice";
import {
  DEFAULT_NOTE_LANGUAGE,
  getRememberedNoteLanguage,
  isNoteLanguage,
  NOTE_LANGUAGES,
  rememberNoteLanguage
} from "../utils/noteLanguages"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

const MAX_SOURCE_LENGTH = 15000
const MAX_PDF_SIZE = 10 * 1024 * 1024

function TopicForm({setResult, setNoteId, setTopic: setResultTopic, setLanguage: setResultLanguage, setLoading, loading, setError}) {
    const [topic, setTopic] = useState("");
    const [inputMode, setInputMode] = useState("topic");
    const [sourceText, setSourceText] = useState("");
    const [pdfName, setPdfName] = useState("");
    const [pdfTruncated, setPdfTruncated] = useState(false);
    const [pdfTooShort, setPdfTooShort] = useState(false);
    const [extractingPdf, setExtractingPdf] = useState(false);
    const [classLevel, setClassLevel] = useState("");
    const [examType, setExamType] = useState("");
    const [language, setLanguage] = useState(getRememberedNoteLanguage);
    const [revisionMode, setRevisionMode] = useState(false);
    const [includeDiagram, setIncludeDiagram] = useState(false);
    const [includeChart, setIncludeChart] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const dispatch = useDispatch()

    useEffect(() => {
      rememberNoteLanguage(language)
    }, [language])

    const handlePdfUpload = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      setError("")
      setSourceText("")
      setPdfName("")
      setPdfTruncated(false)
      setPdfTooShort(false)

      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please choose a PDF file")
        event.target.value = ""
        return
      }
      if (file.size > MAX_PDF_SIZE) {
        setError("PDF files must be 10 MB or smaller")
        event.target.value = ""
        return
      }

      setExtractingPdf(true)
      try {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
        const pages = []
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber)
          const pageContent = await page.getTextContent()
          pages.push(pageContent.items
            .filter((item) => "str" in item)
            .map((item) => item.str)
            .join(" "))
        }

        const extractedText = pages.join("\n").replace(/\s+/g, " ").trim()
        const limitedText = extractedText.slice(0, MAX_SOURCE_LENGTH)
        setSourceText(limitedText)
        setPdfName(file.name)
        setPdfTruncated(extractedText.length > MAX_SOURCE_LENGTH)
        setPdfTooShort(extractedText.length < 200)
        setTopic((currentTopic) => currentTopic.trim() || file.name.replace(/\.pdf$/i, ""))
      } catch (error) {
        console.error("Failed to extract PDF text:", error)
        setError("Could not read this PDF. Try another PDF or paste its text instead.")
      } finally {
        setExtractingPdf(false)
      }
    }

    const handleSubmit = async () => {
      if (!topic.trim()) {
        setError("Please enter the topic")
        return;
      }
      if (inputMode !== "topic" && !sourceText.trim()) {
        setError(inputMode === "pdf"
          ? "Upload a PDF with selectable text before generating notes"
          : "Please paste the source text")
        return
      }
      if (inputMode === "pdf" && pdfTooShort) {
        setError("This PDF has too little selectable text. Try a text-based PDF or paste the text.")
        return
      }
      setError("")
      setLoading(true)
      setResult(null)
      setNoteId(null)
      setResultTopic("")
      try {
        const result = await generateNotes({
          topic,
          classLevel,
          examType,
          revisionMode,
          includeDiagram,
          includeChart,
          language,
          sourceText: inputMode === "topic" ? undefined : sourceText.trim()})
          setResult(result.data)
          setNoteId(result.noteId)
          setResultTopic(topic)
          setResultLanguage(result.language || DEFAULT_NOTE_LANGUAGE)
          setLoading(false)
          setClassLevel("")
          setTopic("")
          setInputMode("topic")
          setSourceText("")
          setPdfName("")
          setPdfTruncated(false)
          setPdfTooShort(false)
          setExamType("")
          setIncludeChart(false)
          setRevisionMode(false)
          setIncludeDiagram(false)

          if(typeof result.creditsLeft === "number"){
            dispatch(updateCredits(result.creditsLeft))
          }

      } catch (error) {
        console.log(error)
        setError("failed to fetch notes from server")
        setLoading(false)

      }
    }

    useEffect(() => {
      if (!loading) {
        setProgress(0);
        setProgressText("")
        return;
      }
      let value = 0;

      const interval = setInterval(() => {
        value += Math.random() * 8

        if (value >= 95) {
          value = 95;
          setProgressText("Almost done...");
          clearInterval(interval);
        } else if (value > 70) {
          setProgressText("Finalizing notes...");
        } else if (value > 40) {
          setProgressText("Processing content...");
        } else {
          setProgressText("Generating notes...");
        }
        
        setProgress(Math.floor(value))

      }, 700)
      
      return () => clearInterval(interval);

    }, [loading])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-black/90 
      via-black/80 to-black/90 backdrop-blur-2xl border 
      border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.75)] 
      p-8 space-y-6 text-white">

        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {[
            ["topic", "Topic"],
            ["text", "Paste text"],
            ["pdf", "Upload PDF"]
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setInputMode(mode)
                setError("")
              }}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                inputMode === mode
                  ? "bg-white text-black shadow"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
        type="text"
        className="w-full p-3 rounded-xl 
        bg-white/10 backdrop-blur-lg 
        border border-white/20 placeholder-gray-400 
        text-white 
        focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder="Enter topic (e.g. Web Development)"
        onChange={(e) => setTopic(e.target.value)}
        value={topic}/>

        {inputMode === "text" && (
          <div className="space-y-2">
            <textarea
              className="min-h-48 w-full resize-y rounded-xl border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400 backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Paste syllabus, textbook, or study material here..."
              maxLength={MAX_SOURCE_LENGTH}
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
            />
            <p className="text-right text-xs text-gray-400">
              {sourceText.length.toLocaleString()} / {MAX_SOURCE_LENGTH.toLocaleString()} characters
            </p>
          </div>
        )}

        {inputMode === "pdf" && (
          <div className="space-y-2">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdfUpload}
              disabled={extractingPdf}
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-gray-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-black"
            />
            <p className="text-xs text-gray-400">PDF only, up to 10 MB. Selectable text is required.</p>
            {extractingPdf && <p className="text-sm text-gray-300">Extracting PDF text...</p>}
            {pdfName && !extractingPdf && (
              <p className="text-sm text-gray-300">
                {pdfName} · {sourceText.length.toLocaleString()} characters extracted
              </p>
            )}
            {pdfTruncated && (
              <p className="text-sm text-amber-300">Using first 15,000 characters.</p>
            )}
            {pdfTooShort && (
              <p className="text-sm text-amber-300">
                This looks like a scanned PDF — no selectable text found.
              </p>
            )}
          </div>
        )}

        <input
        type="text"
        className="w-full p-3 rounded-xl 
        bg-white/10 backdrop-blur-lg 
        border border-white/20 placeholder-gray-400 
        text-white 
        focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder='Class / Level (e.g. Class 10)'
        onChange={(e) => setClassLevel(e.target.value)}
        value={classLevel}/>

        <input
        type="text"
        className="w-full p-3 rounded-xl 
        bg-white/10 backdrop-blur-lg 
        border border-white/20 placeholder-gray-400 
        text-white 
        focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder='Exam Type(e.g. SPPU, CBSE, JEE, NEET)'
        onChange={(e) => setExamType(e.target.value)}
        value={examType}/>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-200">Notes language</span>
          <span className="relative block">
            <select
              value={language}
              onChange={(event) => {
                const value = event.target.value
                setLanguage(isNoteLanguage(value) ? value : DEFAULT_NOTE_LANGUAGE)
              }}
              disabled={loading}
              className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 p-3 pr-10 text-white backdrop-blur-lg focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {NOTE_LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value} className="bg-gray-900 text-white">
                  {label}
                </option>
              ))}
            </select>
            <FiChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
            />
          </span>
          {language !== "English" && (
            <span className="block text-xs text-gray-400">
              Technical terms stay in English, and diagrams and charts use English labels.
            </span>
          )}
        </label>

        <div className='flex flex-col md:flex-row gap-6'>
            <Toggle label="Exam Revision Mode" checked={revisionMode} 
            onChange={() => setRevisionMode(!revisionMode)} />

            <Toggle label="Include Diagram" checked={includeDiagram} 
            onChange={() => setIncludeDiagram(!includeDiagram)} />

            <Toggle label="Include Charts" checked={includeChart} 
            onChange={() => setIncludeChart(!includeChart)} />
        </div>

        <motion.button
        onClick={handleSubmit}
        whileHover={!loading ? { scale: 1.02} : {}}
        whileTap={!loading ? { scale: 0.95 } : {}}
        disabled={loading || extractingPdf || (inputMode === "pdf" && pdfTooShort)}
        className={`w-full mt-4 py-3 rounded-xl 
            font-semibold flex items-center justify-center gap-3 
            transition
            ${
            loading || extractingPdf || (inputMode === "pdf" && pdfTooShort)
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-br from-white to-gray-200 text-black shadow-[0_15px_35px_rgba(0,0,0,0.4)]"
            }
        `}>
        {loading ? "Generating Notes..." : "Generate Notes"}
        </motion.button>

        { loading &&
        <div className='mt-4 space-y-2'>

        <div className='w-full h-2 rounded-full bg-white/10 overflow-hidden'>
          <motion.div
            initial={{width:0}}
            animate={{width : `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.6 }}
            className='h-full bg-gradient-to-r from-green-400 via-emerald-400 to-green-500'
          >
          </motion.div>

        </div>

        <div className='flex justify-between text-xs text-gray-300'>
          <span>{progressText}</span>
          <span>{progress}%</span>
        </div>
        <p className='text-xs text-gray-400 text-center'>
        This may take up to 2-5 minutes. Please don't close refresh the page.
        </p>

      </div>}



    </motion.div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className='flex items-center gap-4 cursor-pointer select-none' onClick={onChange}>
      <motion.div
        animate={{
          backgroundColor: checked
            ? "rgba(34, 197, 94, 0.35)"
            : "rgba(255, 255, 255, 0.15)"
        }}
        transition={{ duration: 0.25 }}
        className='relative w-12 h-6 rounded-full 
        border border-white/20 backdrop-blur-lg'
      >
        <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className='absolute top-0.5 h-5 w-5 
        rounded-full bg-white shadow-[0_5px_15px_rgba(0,0,0,0.5)]'
        style={{
            left: checked ? "1.6rem" : "0.25rem",
        }}
        >
    
        </motion.div>

      </motion.div>
      
      <span className={`text-sm transition-colors 
            ${checked ? "text-green-300" : "text-gray-300"}`}>
            {label}
      </span>

    </div>
  )
}


export default TopicForm;