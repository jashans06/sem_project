import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { motion } from 'motion/react'
import MermaidSetup from './MermaidSetup'
import ReactMarkdown from 'react-markdown'
import RechartSetUp from './RechartSetup.jsx'
import Flashcards from './Flashcards'
import Quiz from './Quiz'
import ReadAloudControl from './ReadAloudControl'
import { generateNoteExtra } from '../services/api'
import { updateCredits } from '../redux/userSlice'

const MotionButton = motion.button

// eslint-disable-next-line react-refresh/only-export-components
export const MarkdownComponents = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-indigo-700 mt-6 mb-4 border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-indigo-600 mt-5 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-3">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc ml-6 space-y-1 text-gray-700">
        {children}
      </ul>
    ),
    li: ({ children }) => (
      <li className="marker:text-indigo-500">{children}</li>
    ),
  }
function FinalResult({result, noteId, topic, language = "English", initialExtras, notesEditor}) {
  const[quickRevision, setQuickRevision] = useState(false);
  const [activeTab, setActiveTab] = useState("notes")
  const [extras, setExtras] = useState(initialExtras || {})
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [extraError, setExtraError] = useState("")
  const [selectedQuizIndex, setSelectedQuizIndex] = useState(null)
  const dispatch = useDispatch()
  const noteSections = useMemo(
    () => (typeof result?.notes === "string"
      ? result.notes.split(/\n(?=#{1,6}\s)|\n\s*\n/).map((section) => section.trim()).filter(Boolean)
      : []),
    [result?.notes]
  )
  const extraCosts = { flashcards: 3, quiz: 5, modelAnswers: 5 }
  const quizSets = Array.isArray(extras.quizSets) && extras.quizSets.length
    ? extras.quizSets
    : extras.quiz
      ? [extras.quiz]
      : []
  const activeQuizIndex = selectedQuizIndex === null
    ? quizSets.length - 1
    : Math.min(selectedQuizIndex, quizSets.length - 1)

  const createExtra = async (type, newSet = false) => {
    setLoadingExtra(true)
    setExtraError("")
    try {
      const response = await generateNoteExtra(noteId, type, newSet ? { newSet: true } : {})
      setExtras((current) => ({
        ...current,
        [type]: response.data,
        ...(response.quizSets ? { quizSets: response.quizSets } : {})
      }))
      if (response.quizSets) {
        setSelectedQuizIndex(response.quizSets.length - 1)
      }
      if (typeof response.creditsLeft === "number") {
        dispatch(updateCredits(response.creditsLeft))
      }
    } catch (error) {
      console.error("Study extra generation failed:", error)
      setExtraError(error.response?.data?.message || "Unable to generate this study extra.")
    } finally {
      setLoadingExtra(false)
    }
  }

  const printNotes = () => {
    setQuickRevision(false)
    setActiveTab("notes")
    setTimeout(async () => {
      const originalTitle = document.title
      document.title = `ExamEnAI - ${topic || "Notes"}`
      try {
        await document.fonts?.ready
        window.print()
      } finally {
        document.title = originalTitle
      }
    }, 100)
  }

  if(
    !result||
    !result.subTopics ||
    !result.questions||
    !result.questions.short||
    !result.questions.long|| 
    !result.revisionPoints
  ){
    return null;
  }

  return (
  <div
    id="print-area"
    lang={language === "Hindi" ? "hi" : language === "Hinglish" ? "hi-Latn" : "en"}
    data-note-id={noteId}
    className={`mt-6 p-3 space-y-10 bg-white ${language === "Hindi" ? "leading-relaxed" : ""}`}
  >

    <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Study materials">
      {[
        ["notes", "Notes"],
        ["flashcards", "Flashcards"],
        ["quiz", "Quiz"],
        ["modelAnswers", "Model Answers"]
      ].map(([tab, label]) => (
        <MotionButton
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          key={tab}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setActiveTab(tab)
            setExtraError("")
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === tab
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {label}
        </MotionButton>
      ))}
    </div>

    {activeTab === "notes" && <>
    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>

      <h2 className='text-3xl font-bold
      bg-gradient-to-r from-indigo-600 to-purple-600
      bg-clip-text text-transparent'>
        📄 Generated Notes
      </h2>

      <div className='flex gap-3 print:hidden'>
        <button onClick={() => setQuickRevision(!quickRevision)} className={`
        px-4 py-2 rounded-lg text-sm font-medium transition
        ${quickRevision
          ? "bg-green-600 text-white"
          : "bg-green-100 text-green-700 hover:bg-green-200"}
        `}> {quickRevision ? "Exit Revision Mode" : "Quick Revision (5 min)"}</button>
        <button onClick={printNotes}
        className='px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600
        text-white hover:bg-indigo-700'>
          ⬇️ Download PDF
        </button>
      </div>
    </div>

    {!quickRevision && <section className="break-inside-avoid print:break-inside-avoid">
      <SectionHeader icon="⭐" title="Sub Topics" color="indigo"/>
      {
          Object.entries(result.subTopics).map(([star, topics])=>(
            <div key={star} className='mb-3
           '>

              <p className='font-medium text-indigo-600 mb-1'>
                {star} Priority
              </p>
              <ul className='list-disc ml-6 text-gray-700'>
                {topics.map((t,i)=>(
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ))
        }
    </section>}

    {!quickRevision && <section className="break-inside-avoid print:break-inside-avoid">
      <SectionHeader
        icon="📝"
        title="Detailed Notes"
        color="purple"
        action={(
          <ReadAloudControl
            key={language}
            items={noteSections}
            language={language}
          />
        )}
      />
      <div className='bg-white border border-gray-200 rounded-xl p-6'>
        {notesEditor ?? (
          <ReactMarkdown components={MarkdownComponents}>
            {result.notes}
          </ReactMarkdown>
        )}
      </div>
    </section>}

    {quickRevision &&
    <section className='break-inside-avoid print:break-inside-avoid rounded-xl bg-gradient-to-r from-green-100 to-green-50 border
    border-green-200 p-6'>
      <h3 className='font-bold text-green-700 mb-3 text-lg'>
        ⚡ Exam Quick Revision Points
      </h3>
      <ul className='list-disc ml-6 space-y-1 text-gray-800'>
        {result.revisionPoints.map((p,i)=>(
          <li key={i}>{p}</li>
        ))}
      </ul>
    </section>}

    {result.diagram?.data && <section className="break-inside-avoid print:break-inside-avoid">
      <SectionHeader icon="📊" title="Diagram" color="cyan"/>

      <MermaidSetup diagram={result.diagram?.data}/>
      <p className="mt-3 text-xs text-gray-500 italic">
        If you need this diagram for future reference or revision,
        you can save it by taking a screenshot.
      </p>

      </section>}

      {result.charts?.length > 0 &&
      <section className="break-inside-avoid print:break-inside-avoid">
        <SectionHeader icon="📊" title="Visual Charts" color="indigo" />
        <RechartSetUp charts={result.charts} />
        <p className="mt-3 text-xs text-gray-500 italic">
          If you need this Chart for future reference or revision,
          you can save it by taking a screenshot.
        </p>
      
      </section>}
      
      {result.charts && result.charts.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          📉 Charts are not relevant for this topic.
        </p>
      )}

    <section className="break-inside-avoid print:break-inside-avoid">
      <SectionHeader icon="❓" title="Important Questions" color="rose"/>

      <p className='font-medium'>Short Questions:</p>
      <ul className='list-disc ml-6 text-gray-700'>
        {result.questions.short.map((q,i)=>(
          <li key={i}>{q}</li>
        ))}
      </ul>

      <p className='font-medium mt-4'>Long Questions:</p>
      <ul className='list-disc ml-6 text-gray-700'>
        {result.questions.long.map((q,i)=>(
          <li key={i}>{q}</li>
        ))}
      </ul>

      <p className='font-medium mt-4'>Diagram Question:</p>
      <ul className='list-disc ml-6 text-gray-700'>
        {result.questions?.diagram && <li>{result.questions.diagram}</li>}
      </ul>

    </section>
    </>}

    {activeTab !== "notes" && (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-indigo-700">
          {activeTab === "modelAnswers"
            ? "Model Answers"
            : activeTab === "flashcards"
              ? "Flashcards"
              : "Quiz"}
        </h2>

        {loadingExtra && (
          <div className="animate-pulse space-y-4" aria-label="Loading study material">
            <div className="h-5 w-1/3 rounded bg-gray-200" />
            <div className="h-32 rounded-xl bg-gray-200" />
            <div className="h-10 w-32 rounded bg-gray-200" />
          </div>
        )}

        {!loadingExtra && extraError && (
          <p role="alert" className="text-sm text-red-600">{extraError}</p>
        )}

        {!loadingExtra && (
          (activeTab === "quiz" ? quizSets.length === 0 : !extras[activeTab]) && (
          <button
            type="button"
            disabled={!noteId}
            onClick={() => createExtra(activeTab)}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            Generate {activeTab === "modelAnswers" ? "Model Answers" : activeTab === "flashcards" ? "Flashcards" : "Quiz"} ({extraCosts[activeTab]} credits)
          </button>
          )
        )}

        {!loadingExtra && activeTab === "flashcards" && extras.flashcards && (
          <Flashcards cards={extras.flashcards} />
        )}
        {!loadingExtra && activeTab === "quiz" && quizSets.length > 0 && (
          <div className="space-y-5">
            {quizSets.length > 1 && (
              <div className="flex flex-wrap gap-2" aria-label="Saved quiz sets">
                {quizSets.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={activeQuizIndex === index}
                    onClick={() => setSelectedQuizIndex(index)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      activeQuizIndex === index
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    Quiz {index + 1}
                  </button>
                ))}
              </div>
            )}
            <Quiz
              key={`${noteId}-${activeQuizIndex}`}
              noteId={noteId}
              questions={quizSets[activeQuizIndex]}
              onQuit={() => setActiveTab("notes")}
              onGenerateAnother={() => createExtra("quiz", true)}
              nextQuizCost={quizSets.length === 1 ? 0 : extraCosts.quiz}
            />
          </div>
        )}
        {!loadingExtra && activeTab === "modelAnswers" && extras.modelAnswers && (
          <div className="space-y-6">
            {extras.modelAnswers.map((item, index) => (
              <section key={`${item.question}-${index}`} className="break-inside-avoid rounded-xl border p-5">
                <h3 className="mb-3 font-semibold text-indigo-700">{item.question}</h3>
                <ReactMarkdown components={MarkdownComponents}>
                  {item.answer}
                </ReactMarkdown>
              </section>
            ))}
          </div>
        )}
      </div>
    )}

  </div>
)
}

function SectionHeader({icon, title, color, action}){
  const colors = {
    indigo: "from-indigo-100 to-indigo-50 text-indigo-700",
    purple: "from-purple-100 to-purple-50 text-purple-700",
    blue: "from-blue-100 to-blue-50 text-blue-700",
    green: "from-green-100 to-green-50 text-green-700",
    cyan: "from-cyan-100 to-cyan-50 text-cyan-700",
    rose: "from-rose-100 to-rose-50 text-rose-700",
  };
  return(
    <div className={`
      mb-4 px-4 py-2 rounded-lg
      bg-gradient-to-r ${colors[color]}
      font-semibold flex items-center gap-2
    `}>
      <span>{icon}</span>
      <span>{title}</span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export default FinalResult