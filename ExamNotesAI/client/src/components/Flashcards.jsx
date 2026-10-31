import { useState } from "react"
import { motion } from "motion/react"

const MotionButton = motion.button

function Flashcards({cards}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = cards?.[currentIndex]

  if (!card) return <p className="text-sm text-gray-500">No flashcards are available.</p>

  const changeCard = (index) => {
    setCurrentIndex(index)
    setFlipped(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Card {currentIndex + 1} of {cards.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <div className="h-56" style={{ perspective: 1000 }}>
        <MotionButton
          type="button"
          onClick={() => setFlipped(!flipped)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative h-full w-full rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center shadow-sm"
        >
          <span
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="mb-3 text-xs uppercase tracking-wide text-indigo-500">
              {card.topic}
            </span>
            <span className="text-lg font-semibold text-gray-800">{card.front}</span>
            <span className="mt-4 text-xs text-gray-500">Click to reveal</span>
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white p-6 text-gray-800"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {card.back}
          </span>
        </MotionButton>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => changeCard(currentIndex - 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={currentIndex === cards.length - 1}
          onClick={() => changeCard(currentIndex + 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Flashcards
