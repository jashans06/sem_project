import { createSlice } from "@reduxjs/toolkit"

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    authAttempt: 0,
    isGoogleAuthPending: false
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    startGoogleAuth: (state) => {
      state.authAttempt += 1
      state.isGoogleAuthPending = true
      state.userData = null
    },
    completeGoogleAuth: (state, action) => {
      state.userData = action.payload
      state.isGoogleAuthPending = false
    },
    cancelGoogleAuth: (state) => {
      state.isGoogleAuthPending = false
    },
    updateCredits:(state,action)=>{
      if(state.userData){
        state.userData.credits = action.payload
      }
    }
  }
})

export const {
  setUserData,
  startGoogleAuth,
  completeGoogleAuth,
  cancelGoogleAuth,
  updateCredits
} = userSlice.actions
export default userSlice.reducer