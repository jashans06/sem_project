import axios from "axios"
import { serverUrl } from "../App"
import { setUserData, updateCredits } from "../redux/userSlice"

export const getCurrentUser = async (dispatch) => {
  try {
    const result = await axios.get(serverUrl + "/api/user/currentuser",
    { withCredentials: true })
   
    dispatch(setUserData(result.data))

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

export const downloadPdf = async (result) => {
  try {
    const response = await axios.post(serverUrl+ "/api/pdf/generate-pdf" , {result} , {
      responseType:"blob" , withCredentials:true
    })

    const blob = new Blob([response.data], {
    type: "application/pdf"
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ExamEnAI.pdf";
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error("PDF download failed", { cause: error });

  }
}