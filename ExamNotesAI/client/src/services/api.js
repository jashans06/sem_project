import axios from "axios"
import { serverUrl } from "../App"
import { setUserData, updateCredits } from "../redux/userSlice"

export const getCurrentUser = () => async (dispatch, getState) => {
  const { authAttempt, isGoogleAuthPending } = getState().user
  if (isGoogleAuthPending) return

  try {
    const result = await axios.get(serverUrl + "/api/user/currentuser",
    { withCredentials: true })

    const currentState = getState().user
    if (
      currentState.authAttempt === authAttempt &&
      !currentState.isGoogleAuthPending
    ) {
      dispatch(setUserData(result.data))
    }

  } catch (error) {
    console.log(error);
  }
}

export const confirmCreditsPayment = async (sessionId, dispatch) => {
  const result = await axios.post(
    serverUrl + "/api/credit/confirm",
    { sessionId },
    { withCredentials: true }
  )
  dispatch(updateCredits(result.data.credits))
  return result.data
}

export const generateNotes = async (payload) => {
  try {
    const result = await axios.post(serverUrl + "/api/notes/generate-notes", payload, {withCredentials: true})
    console.log(result.data)
    return result.data
  } catch (error) {
    console.log(error)
    throw error 
  }
}

export const generateNoteExtra = async (noteId, type, options = {}) => {
  const result = await axios.post(
    `${serverUrl}/api/notes/${noteId}/extras`,
    { type, ...options },
    { withCredentials: true }
  )
  return result.data
}

export const deleteNote = async (noteId) => {
  const result = await axios.delete(
    `${serverUrl}/api/notes/${noteId}`,
    { withCredentials: true }
  )
  return result.data
}

export const updateNoteText = async (noteId, notes) => {
  const result = await axios.put(
    `${serverUrl}/api/notes/${noteId}`,
    { notes },
    { withCredentials: true }
  )
  return result.data
}

export const saveQuizAttempt = async (noteId, attempt) => {
  const result = await axios.post(
    `${serverUrl}/api/notes/${noteId}/quiz-attempt`,
    attempt,
    { withCredentials: true }
  )
  return result.data
}
