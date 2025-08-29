import express from "express";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import routes from "./routes/indexRouter.js";

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

//Middleware to parse JSON request bodies
app.use(express.json());

//Middleware to parse URL-encoded form submissions
app.use(
  express.urlencoded({ extended: true, limit: "1mb", parameterLimit: 5000 })
);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Use the router
app.use(routes);

// 404 Error Handler - Handles unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// 500 Error Handler - Catches and logs server Errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong, please try again later" });
});

// Start the server
app.listen(PORT, () => console.log(`App listening on ${PORT}`));
