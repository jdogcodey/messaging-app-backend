import express from "express";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import routes from "./routes/indexRouter.js";

const app = express();

// Workaround for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
app.use(
  express.urlencoded({ extended: true, limit: "1mb", parameterLimit: 5000 })
);
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use(routes);

// 404
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong, please try again later" });
});

export default app;
