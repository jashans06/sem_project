// import "./loadEnv.js"; // ← MUST be first line
// import express from "express";
// import connectDb from "./utils/connectDb.js";
// import authRouter from "./routes/auth.route.js";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import userRouter from "./routes/user.route.js";
// import notesRouter from "./routes/generate.route.js";
// import pdfRouter from "./routes/pdf.route.js";
// import creditRouter from "./routes/credit.route.js";
// import { stripeWebhook } from "./controllers/credits.controller.js";
// import { clientOrigins } from "./utils/clientOrigins.js";

// const app = express();

// app.use(async (req, res, next) => {
//   try {
//      await connectDb();
//      next(); 
//     }
//   catch (e) { res.status(500).json({ message: "DB connection failed" }); }
// });


// //  Stripe webhook MUST be before express.json() middleware
// app.post(
//   ["/api/credits/webhook", "/api/credit/webhook"],
//   express.raw({ type: "application/json" }),
//   stripeWebhook
// );

// //  CORS
// // app.use(cors({
// //   origin: (origin, callback) => {
// //     callback(null, !origin || clientOrigins.includes(origin) ? origin : false);
// //   },
// //   credentials: true,
// //   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
// // }));

// app.use(cors({
//   origin: (origin, callback) => {
//     // 1. Allow server-to-server requests or tools like Postman (where origin is undefined)
//     if (!origin) {
//       return callback(null, true);
//     }
    
//     // 2. Check if the incoming browser origin is in your whitelist array
//     if (clientOrigins.includes(origin)) {
//       return callback(null, true); // Pass true to allow it
//     } else {
//       // Pass an explicit error to block unauthorized origins cleanly
//       return callback(new Error("Blocked by CORS policy")); 
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"] // Essential for Google Auth headers
// }));

// // ✅ Fix Firebase popup COOP issue
// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
//   next();
// });

// app.use(express.json());
// app.use(cookieParser());

// const PORT = process.env.PORT || 5000;

// // ✅ Health check route
// app.get("/", (req, res) => {
//   res.json({ message: "ExamEnAI Backend Running" });
// });

// // ✅ All routes
// app.use("/api/auth", authRouter);
// app.use("/api/user", userRouter);
// app.use("/api/notes", notesRouter);
// app.use("/api/pdf", pdfRouter);
// app.use("/api/credit", creditRouter);

// export default app;

// if (!process.env.VERCEL) {
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }




// import "./loadEnv.js"; // ← MUST be first line
// import express from "express";
// import connectDb from "./utils/connectDb.js";
// import authRouter from "./routes/auth.route.js";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import userRouter from "./routes/user.route.js";
// import notesRouter from "./routes/generate.route.js";
// import pdfRouter from "./routes/pdf.route.js";
// import creditRouter from "./routes/credit.route.js";
// import { stripeWebhook } from "./controllers/credits.controller.js";
// import { clientOrigins } from "./utils/clientOrigins.js";

// const app = express();

// // 1. ✅ CORS MUST BE FIRST (So error responses still get CORS headers)
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (clientOrigins.includes(origin)) {
//       return callback(null, true);
//     } else {
//       return callback(new Error("Blocked by CORS policy")); 
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));

// // 2. ✅ Database Connection Middleware (Moved safely below CORS)
// app.use(async (req, res, next) => {
//   try {
//      await connectDb();
//      next(); 
//     }
//   catch (e) { 
//      console.error("DB Connection Error:", e); // Log it on Vercel dashboard
//      res.status(500).json({ message: "DB connection failed" }); 
//   }
// });

// // 3. ⚠️ Stripe webhook MUST be before express.json() middleware
// app.post(
//   ["/api/credits/webhook", "/api/credit/webhook"],
//   express.raw({ type: "application/json" }),
//   stripeWebhook
// );

// // 4. ✅ Fix Firebase popup COOP issue
// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
//   next();
// });

// app.use(express.json());
// app.use(cookieParser());

// const PORT = process.env.PORT || 5000;

// // ✅ Health check route
// app.get("/", (req, res) => {
//   res.json({ message: "ExamEnAI Backend Running" });
// });

// // ✅ All routes
// app.use("/api/auth", authRouter);
// app.use("/api/user", userRouter);
// app.use("/api/notes", notesRouter);
// app.use("/api/pdf", pdfRouter);
// app.use("/api/credit", creditRouter);

// export default app;

// if (!process.env.VERCEL) {
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }


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

// 1. ✅ CORS MUST BE FIRST
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (clientOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Blocked by CORS policy")); 
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// 2. ✅ Explicit Preflight handler (Forces immediate 200 OK)
app.options("*", (req, res) => {
  res.sendStatus(200); 
});

// 3. ✅ Database Connection Middleware (Skips DB check for OPTIONS preflight)
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next(); 
  }
  try {
     await connectDb();
     next(); 
  }
  catch (e) { 
     console.error("DB Connection Error:", e);
     res.status(500).json({ message: "DB connection failed" }); 
  }
});

// 4. ⚠️ Stripe webhook MUST be before express.json() middleware
app.post(
  ["/api/credits/webhook", "/api/credit/webhook"],
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// 5. ✅ Fix Firebase popup COOP issue
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