import axios from 'axios'
import React, { useEffect, useMemo, useState } from 'react'
import { serverUrl } from '../App'
import { motion, AnimatePresence } from "motion/react"
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GiHamburgerMenu } from "react-icons/gi";
import { FiGlobe, FiTrash2 } from "react-icons/fi"
import FinalResult from '../components/FinalResult'
import { getNoteLanguageLabel } from '../utils/noteLanguages'
import { deleteNote, updateNoteText } from '../services/api'

const MAX_NOTE_LENGTH = 20000

function History() {
  const [topics, setTopics] = useState([])
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user)
  const credits = userData?.credits ?? 0
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeNoteId, setActiveNotesId] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [listRetry, setListRetry] = useState(0)
  const [noteError, setNoteError] = useState("")
  const [search, setSearch] = useState("")
  const [examFilter, setExamFilter] = useState("")
  const [sortNewestFirst, setSortNewestFirst] = useState(true)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editedNotes, setEditedNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [editError, setEditError] = useState("")

  useEffect(() => {
    let isMounted = true
    const myNotes = async () => {
      setListLoading(true)
      setListError("")
      try {
        const res = await axios.get(serverUrl + "/api/notes/getnotes", { withCredentials: true })
        if (isMounted) {
          setTopics(Array.isArray(res.data) ? res.data : [])
        }
      } catch (error) {
        console.error("Failed to load notes:", error)
        if (isMounted) {
          setListError(error.response?.data?.message || "Unable to load your notes. Please try again.")
        }
      } finally {
        if (isMounted) setListLoading(false)
      }
    }
    myNotes()
    return () => { isMounted = false }
  }, [listRetry])

  const normalizedSearch = normalizeText(search)
  const examOptions = useMemo(() => {
    const options = new Map()
    topics.forEach((note) => {
      const label = tidyText(note.examType)
      const value = normalizeText(label)
      if (value && !options.has(value)) options.set(value, label)
    })
    return [...options.entries()].map(([value, label]) => ({ value, label }))
  }, [topics])

  const visibleTopics = useMemo(() => {
    return [...topics]
      .filter((note) => {
        const matchesSearch = !normalizedSearch ||
          normalizeText(note.topic).includes(normalizedSearch)
        const matchesExam = !examFilter || normalizeText(note.examType) === examFilter
        return matchesSearch && matchesExam
      })
      .sort((left, right) => {
        const dateDifference = new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
        return sortNewestFirst ? -dateDifference : dateDifference
      })
  }, [topics, normalizedSearch, examFilter, sortNewestFirst])

  const hasActiveFilters = Boolean(normalizedSearch || examFilter)
  const selectedMetadata = selectedNote
    ? topics.find((note) => note._id === selectedNote._id) || selectedNote
    : null

  const isEditDirty = isEditingNotes &&
    editedNotes !== (typeof selectedNote?.content?.notes === "string" ? selectedNote.content.notes : "")

  const confirmDiscardEdits = () => {
    if (!isEditDirty) return true
    return window.confirm("Discard your unsaved changes to this note?")
  }

  const clearEditor = () => {
    setIsEditingNotes(false)
    setEditedNotes("")
    setEditError("")
  }

  const openNotes = async (noteId, force = false) => {
    if (!force && noteId === activeNoteId) return true
    if (loading || savingNotes) return false
    if (!confirmDiscardEdits()) return false

    clearEditor()
    setLoading(true)
    setNoteError("")
    setSelectedNote(null)
    setActiveNotesId(noteId)
    try {
      const res = await axios.get(serverUrl + `/api/notes/${noteId}`, { withCredentials: true })
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      setSelectedNote(data)
    } catch (error) {
      console.error("Failed to load note:", error)
      setNoteError(error.response?.data?.message || "Unable to load this note. Please try again.")
    } finally {
      setLoading(false)
    }
    return true
  }

  const beginDelete = (note, event) => {
    event.stopPropagation()
    if (deleting || savingNotes || loading) return
    if (note._id === activeNoteId && !confirmDiscardEdits()) return
    if (note._id === activeNoteId) clearEditor()
    setDeleteError("")
    setNoteToDelete(note)
  }

  const cancelDelete = () => {
    if (deleting) return
    setNoteToDelete(null)
    setDeleteError("")
  }

  const confirmDelete = async () => {
    if (!noteToDelete || deleting) return
    setDeleting(true)
    setDeleteError("")
    try {
      await deleteNote(noteToDelete._id)
      setTopics((current) => current.filter((note) => note._id !== noteToDelete._id))
      if (activeNoteId === noteToDelete._id) {
        setSelectedNote(null)
        setActiveNotesId(null)
        setNoteError("")
        clearEditor()
      }
      setNoteToDelete(null)
    } catch (error) {
      console.error("Failed to delete note:", error)
      setDeleteError(error.response?.data?.message || "Unable to delete this note. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const beginEdit = () => {
    if (!selectedNote || loading) return
    const currentText = typeof selectedNote.content?.notes === "string"
      ? selectedNote.content.notes
      : ""
    setEditedNotes(currentText)
    setEditError("")
    setIsEditingNotes(true)
  }

  const saveNotes = async () => {
    if (!selectedNote || savingNotes) return
    setSavingNotes(true)
    setEditError("")
    try {
      const result = await updateNoteText(selectedNote._id, editedNotes)
      setSelectedNote((current) => ({
        ...current,
        content: { ...current.content, notes: result.notes }
      }))
      clearEditor()
    } catch (error) {
      console.error("Failed to save edited notes:", error)
      setEditError(error.response?.data?.message || "Unable to save your changes. Please try again.")
    } finally {
      setSavingNotes(false)
    }
  }

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return
      if (noteToDelete) {
        if (!deleting) {
          setNoteToDelete(null)
          setDeleteError("")
        }
      } else if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [noteToDelete, deleting])

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 px-6 py-8'>
      <motion.header
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="print:hidden mb-10 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 px-5 md:px-8 py-6 items-center flex justify-between gap-4 flex-wrap shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Close notes sidebar" : "Open notes sidebar"}
            aria-expanded={isSidebarOpen}
            className="lg:hidden text-white text-2xl"
          >
            {isSidebarOpen ? "✕" : <GiHamburgerMenu />}
          </button>
          <div onClick={() => navigate("/")} className='cursor-pointer'>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent'>
              ExamEnAI
            </h1>
            <p className='text-sm text-gray-300 mt-1'>
              AI-powered exam-oriented notes & revision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm"
            onClick={() => navigate("/pricing")}
          >
            <span className="text-xl">💎</span>
            <span>{credits}</span>
            <motion.span
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.97 }}
              className="ml-2 h-5 w-5 flex items-center justify-center rounded-full bg-white text-xs font-bold"
            >
              ➕
            </motion.span>
          </button>
        </div>
      </motion.header>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.button
              type="button"
              aria-label="Close notes sidebar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
          )}

          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className='fixed lg:static top-0 left-0 z-50 lg:z-auto w-72 lg:w-auto h-full lg:h-[75vh] lg:rounded-3xl lg:col-span-1 bg-black/90 lg:bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_45px_rgba(0,0,0,0.6)] p-5 overflow-y-auto print:hidden'
            >
              <button
                type="button"
                onClick={() => {
                  if (!confirmDiscardEdits()) return
                  clearEditor()
                  setIsSidebarOpen(false)
                  navigate("/notes")
                }}
                className='w-full px-3 py-2 rounded-lg text-sm text-gray-200 bg-white/10 text-start hover:bg-white/20'
              >
                ➕ New Notes
              </button>

              <hr className="border-white/10 my-4" />
              <h2 className='mb-4 text-lg font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent'>
                📝 Your Notes
              </h2>

              <div className="mb-4 space-y-3">
                <label className="block">
                  <span className="sr-only">Search notes</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search notes..."
                    className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </label>
                {examOptions.length > 0 && (
                  <label className="block">
                    <span className="sr-only">Filter by exam type</span>
                    <select
                      value={examFilter}
                      onChange={(event) => setExamFilter(event.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">All exam types</option>
                      {examOptions.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-gray-300">
                  <span>{visibleTopics.length} {visibleTopics.length === 1 ? "note" : "notes"}</span>
                  <button
                    type="button"
                    onClick={() => setSortNewestFirst((current) => !current)}
                    className="rounded-md px-2 py-1 hover:bg-white/10"
                  >
                    {sortNewestFirst ? "Newest first ↓" : "Oldest first ↑"}
                  </button>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setExamFilter("") }}
                    className="text-xs text-indigo-300 hover:text-indigo-200"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {listLoading && <p className="text-sm text-gray-400">Loading your notes...</p>}
              {!listLoading && listError && (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-red-300">{listError}</p>
                  <button
                    type="button"
                    onClick={() => setListRetry((retry) => retry + 1)}
                    className="text-sm text-indigo-300 hover:text-indigo-200"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!listLoading && !listError && topics.length === 0 && (
                <p className="text-sm text-gray-400">No notes created yet</p>
              )}
              {!listLoading && !listError && topics.length > 0 && visibleTopics.length === 0 && (
                <p className="text-sm text-gray-400">No notes match your search</p>
              )}

              <ul className='space-y-3'>
                {!listLoading && !listError && visibleTopics.map((note) => (
                  <li
                    key={note._id}
                    className={`rounded-xl border p-3 transition-all ${
                      activeNoteId === note._id
                        ? "bg-indigo-500/30 border-indigo-400 shadow-[0_0_0_1px_rgba(99,102,241,0.6)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        disabled={loading || savingNotes || deleting}
                        onClick={() => {
                          openNotes(note._id).then((opened) => {
                            if (opened && window.innerWidth < 1024) setIsSidebarOpen(false)
                          })
                        }}
                        className="min-w-0 flex-1 text-left disabled:cursor-wait"
                      >
                        <span className='block break-words text-sm font-semibold text-white'>{note.topic}</span>
                        <span className='mt-2 flex flex-wrap gap-2 text-xs'>
                          {note.classLevel && (
                            <span className='rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-300'>
                              ClassLevel : {note.classLevel}
                            </span>
                          )}
                          {note.examType && (
                            <span className='rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-300'>
                              {note.examType}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                            <FiGlobe aria-hidden="true" />
                            {getNoteLanguageLabel(note.language || "English")}
                          </span>
                        </span>
                        <span className='mt-2 flex flex-wrap gap-3 text-xs text-gray-300'>
                          {note.revisionMode && <span>⚡ Revision</span>}
                          {note.includeDiagram && <span>📊 Diagram</span>}
                          {note.includeChart && <span>📈 Chart</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${note.topic}`}
                        title={`Delete ${note.topic}`}
                        disabled={deleting || savingNotes || loading}
                        onClick={(event) => beginDelete(note, event)}
                        className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.aside>
          )}
        </AnimatePresence>

        <motion.main
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='lg:col-span-3 rounded-2xl bg-white shadow-[0_15px_40px_rgba(0,0,0,0.15)] p-6 min-h-[75vh]'
        >
          {loading && <p className="text-center text-gray-500">Loading notes...</p>}
          {!loading && noteError && (
            <div className="space-y-3 text-center">
              <p role="alert" className="text-red-600">{noteError}</p>
              {activeNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    openNotes(activeNoteId, true)
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Try again
                </button>
              )}
            </div>
          )}
          {!loading && !noteError && !selectedNote && (
            <div className="flex h-full items-center justify-center text-gray-400">
              Select a topic from the Sidebar
            </div>
          )}

          {!loading && selectedNote && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 print:hidden">
                <h2 className="min-w-0 break-words text-lg font-semibold text-gray-800">
                  {selectedNote.topic}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={() => {
                      if (!confirmDiscardEdits()) return
                      clearEditor()
                      navigate("/notes", {
                        state: {
                          prefill: {
                            topic: selectedMetadata.topic || "",
                            classLevel: selectedMetadata.classLevel || "",
                            examType: selectedMetadata.examType || "",
                            language: selectedMetadata.language || "English",
                            revisionMode: Boolean(selectedMetadata.revisionMode),
                            includeDiagram: Boolean(selectedMetadata.includeDiagram),
                            includeChart: Boolean(selectedMetadata.includeChart)
                          }
                        }
                      })
                    }}
                    className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={beginEdit}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Edit notes
                    </button>
                  )}
                </div>
              </div>
              <FinalResult
                key={selectedNote._id}
                result={selectedNote.content}
                noteId={selectedNote._id}
                topic={selectedNote.topic}
                language={selectedNote.language || "English"}
                initialExtras={selectedNote.extras}
                notesEditor={isEditingNotes ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Only the detailed notes text is edited. Revision points and questions are not changed.
                    </p>
                    <textarea
                      aria-label="Edit detailed notes"
                      value={editedNotes}
                      onChange={(event) => setEditedNotes(event.target.value)}
                      maxLength={MAX_NOTE_LENGTH + 1}
                      disabled={savingNotes}
                      className="min-h-[28rem] w-full resize-y rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-70"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className={`text-xs ${editedNotes.length > MAX_NOTE_LENGTH ? "text-red-600" : "text-gray-500"}`}>
                        {editedNotes.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()} characters
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingNotes}
                          onClick={clearEditor}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={
                            savingNotes ||
                            !editedNotes.trim() ||
                            editedNotes === selectedNote.content?.notes ||
                            editedNotes.length > MAX_NOTE_LENGTH
                          }
                          onClick={saveNotes}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingNotes ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                    {editError && <p role="alert" className="text-sm text-red-600">{editError}</p>}
                  </div>
                ) : null}
              />
            </>
          )}
        </motion.main>
      </div>

      <AnimatePresence>
        {noteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) cancelDelete()
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-note-title"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            >
              <h2 id="delete-note-title" className="text-lg font-semibold">Delete this note?</h2>
              <p className="mt-3 break-words text-sm text-gray-300">
                Are you sure you want to delete <span className="font-semibold text-white">{noteToDelete.topic}</span>?
              </p>
              {deleteError && <p role="alert" className="mt-3 text-sm text-red-300">{deleteError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={cancelDelete}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : ""
}

function tidyText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
}

export default History
