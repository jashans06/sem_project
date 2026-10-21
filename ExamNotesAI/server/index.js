import "./loadEnv.js"; // ← MUST be first line
import express from "express";
import connectDb from "./utils/connectDb.js";
import authRouter from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRouter from "./routes/user.route.js";
import notesRouter from "./routes/generate.route.js";
import pdfRouter from "./routes/pdf.route.js";
import creditRouter from "./routes/credit.route.js";
import { stripeWebhook } from "./controllers/credits.controller.js";
import { clientOrigins } from "./utils/clientOrigins.js";

const app = express();

app.use(async (req, res, next) => {
  try {
     await connectDb();
     next(); 
    }
  catch (e) { res.status(500).json({ message: "DB connection failed" }); }
});


//  Stripe webhook MUST be before express.json() middleware
app.post(
  ["/api/credits/webhook", "/api/credit/webhook"],
  express.raw({ type: "application/json" }),
  stripeWebhook
);

//  CORS
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || clientOrigins.includes(origin) ? origin : false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// ✅ Fix Firebase popup COOP issue
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

// ✅ Health check route
app.get("/", (req, res) => {
  res.json({ message: "ExamEnAI Backend Running" });
});

// ✅ All routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/notes", notesRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/credit", creditRouter);

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}