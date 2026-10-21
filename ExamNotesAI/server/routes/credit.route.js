import express from "express"
import isAuth from "../middleware/isAuth.js"
import { confirmCreditsPayment, createCreditsOrder } from "../controllers/credits.controller.js"

const creditRouter = express.Router()
creditRouter.post("/order", isAuth ,createCreditsOrder )
creditRouter.post("/confirm", confirmCreditsPayment)

export default creditRouter