import express from "express";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";

// Defining the PORT from the .env
const PORT = process.env.PORT || 3000;

// Workaround for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Creating the express app
const app = express();

//Allowing cross-site access for the frontend
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
