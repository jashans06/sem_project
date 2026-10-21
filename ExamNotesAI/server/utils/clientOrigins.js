// export const clientOrigins = [
//   "https://ai-mern-project.vercel.app",
//   "http://localhost:5173",
//   "http://localhost:5174",
// ];


export const clientOrigins = [
  process.env.CLIENT_URL,
    "https://sem-project-xugq.vercel.app" 
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);