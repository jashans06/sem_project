import React, { useEffect } from 'react'
import { Route , Routes , Navigate} from 'react-router'
import Home from './pages/Home'
import Auth from './pages/Auth'
import { getCurrentUser } from './services/api'
import { useDispatch , useSelector} from 'react-redux'
import Notes from './pages/Notes'
import History from './pages/History'
import Pricing from './pages/Pricing'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
// eslint-disable-next-line react-refresh/only-export-components
export const serverUrl = import.meta.env.VITE_BACKEND_URL

function App() {
  const dispatch = useDispatch()
  useEffect(()=>{
    dispatch(getCurrentUser())
  },[dispatch])

  const {userData, isGoogleAuthPending} = useSelector((state)=>state.user)

  return (
    <>
    <Routes>
      <Route path='/' element={userData ? <Home/> : <Navigate to="/auth" replace/>}/>
      <Route path='/auth' element={userData && !isGoogleAuthPending ? <Navigate to="/" replace/> : <Auth/>}/>
      <Route path='/history' element={userData ? <History/> : <Navigate to="/auth" replace/>}/>
      <Route path='/notes' element={userData ? <Notes/> : <Navigate to="/auth" replace/>}/>
      <Route path='/pricing' element={userData ? <Pricing/> : <Navigate to="/auth" replace/>}/>
      <Route path='/payment-success' element={<PaymentSuccess/>}/>
      <Route path='/payment-failed' element={<PaymentFailed/>}/>
    </Routes>
    
    </>
  )
}

export default App