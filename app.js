import express from "express";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Defining the PORT from the .env
const PORT = process.env.PORT || 3000;

// Workaround for __dirname in ES modules
const __filename = fileURL;
