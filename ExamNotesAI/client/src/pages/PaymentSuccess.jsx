import React, { useEffect, useState } from 'react'
import { motion as Motion } from "motion/react"
import { FiCheckCircle } from "react-icons/fi";
import { confirmCreditsPayment } from '../services/api';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
function PaymentSuccess() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState(sessionId ? "verifying" : "error")

  useEffect(() => {
    let active = true

    if (!sessionId) {
      return undefined
    }

    confirmCreditsPayment(sessionId, dispatch)
      .then(() => {
        if (active) setStatus("success")
      })
      .catch((error) => {
        console.error("Unable to confirm Stripe payment:", error)
        if (active) setStatus("error")
      })

    return () => {
      active = false
    }
  }, [dispatch, sessionId])

  useEffect(() => {
    if (status !== "success") return undefined
    const timeout = setTimeout(() => navigate("/"), 5000)
    return () => clearTimeout(timeout)
  }, [navigate, status])

  const isSuccess = status === "success"
  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 gap-4'>
      <Motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{
          duration: 0.8,
          ease: "easeOut"
        }}
        className={`${isSuccess ? "text-green-500" : "text-gray-400"} text-6xl`}>
        {isSuccess ? <FiCheckCircle /> : <span aria-hidden="true">…</span>}
      </Motion.div>

      <Motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`text-2xl font-bold ${isSuccess ? "text-green-600" : "text-gray-700"}`}>
        {status === "verifying" && "Verifying your payment..."}
        {isSuccess && "Payment Successful! Credits Added"}
        {status === "error" && "Payment received, but credits could not be verified"}

    </Motion.h1>

    <Motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="text-gray-500 text-sm">
        {status === "verifying" && "Please wait while we update your credits."}
        {isSuccess && "Redirecting to home..."}
        {status === "error" && "Please refresh this page or contact support if your credits are still missing."}

    </Motion.p>
    </div>
  )
}

export default PaymentSuccess