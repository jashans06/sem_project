import { useState } from "react"
import { saveQuizAttempt } from "../services/api"

function Quiz({noteId, questions, onQuit, onGenerateAnother, nextQuizCost}) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(Array(questions.length).fill(null))
  const [completed, setCompleted] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const question = questions[questionIndex]
  const selectedAnswer = answers[questionIndex]

  const selectAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return
    const nextAnswers = [...answers]
    nextAnswers[questionIndex] = optionIndex
    setAnswers(nextAnswers)
  }

  const finishQuiz = async () => {
    const score = answers.reduce(
      (total, answer, index) => total + (answer === questions[index].correctIndex ? 1 : 0),
      0
    )
    const wrongQuestions = questions.filter(
      (_, index) => answers[index] !== questions[index].correctIndex
    )
    const wrongTopics = [...new Set(wrongQuestions.map((item) => item.topic))]
    setSaving(true)
    setCompleted(true)
    try {
      await saveQuizAttempt(noteId, {
        score,
        total: questions.length,
        wrongTopics
      })
    } catch (error) {
      console.error("Quiz attempt save failed:", error)
      setSaveError("Your score is shown, but we could not save this attempt.")
    } finally {
      setSaving(false)
    }
  }

  if (completed) {
    const score = answers.reduce(
      (total, answer, index) => total + (answer === questions[index].correctIndex ? 1 : 0),
      0
    )
    const wrongQuestions = questions.filter(
      (_, index) => answers[index] !== questions[index].correctIndex
    )

    return (
      <div className="space-y-5">
        <h3 className="text-2xl font-bold text-indigo-700">
          Quiz score: {score} / {questions.length}
        </h3>
        {saving && <p className="text-sm text-gray-500">Saving your attempt...</p>}
        {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
        <div className="space-y-4">
          <h4 className="font-semibold">Questions to review</h4>
          {wrongQuestions.length === 0 ? (
            <p className="text-green-700">Perfect score. You got every question right.</p>
          ) : wrongQuestions.map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-lg border p-4">
              <p className="font-medium">{item.question}</p>
              <p className="mt-2 text-sm text-gray-600">
                Correct answer: {item.options[item.correctIndex]}
              </p>
              <p className="mt-1 text-sm text-gray-600">{item.explanation}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onGenerateAnother}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
          >
            Generate more questions{nextQuizCost === 0 ? " (free)" : ` (${nextQuizCost} credits)`}
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="rounded-lg border px-5 py-2 text-gray-700"
          >
            Exit quiz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Question {questionIndex + 1} of {questions.length}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{question.question}</h3>
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            type="button"
            key={`${option}-${index}`}
            disabled={selectedAnswer !== null}
            onClick={() => selectAnswer(index)}
            className={`w-full rounded-lg border p-3 text-left ${
              selectedAnswer === null
                ? "hover:border-indigo-400"
                : index === question.correctIndex
                  ? "border-green-500 bg-green-50"
                  : selectedAnswer === index
                    ? "border-red-500 bg-red-50"
                    : "opacity-70"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {selectedAnswer !== null && (
        <div className="rounded-lg bg-indigo-50 p-4 text-sm text-gray-700">
          <p className="font-semibold">
            {selectedAnswer === question.correctIndex ? "Correct!" : "Not quite."}
          </p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onQuit}
          className="rounded-lg border px-5 py-2 text-gray-700"
        >
          Quit quiz
        </button>
        <button
          type="button"
          disabled={selectedAnswer === null}
          onClick={() => {
            if (questionIndex < questions.length - 1) {
              setQuestionIndex(questionIndex + 1)
            } else {
              finishQuiz()
            }
          }}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white disabled:opacity-40"
        >
          {questionIndex === questions.length - 1 ? "Finish quiz" : "Next question"}
        </button>
      </div>
    </div>
  )
}

export default Quiz
