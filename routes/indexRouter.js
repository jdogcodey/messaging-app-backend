import express from "express";
import indexController from "../controllers/indexController.js";
import validationController from "../controllers/validationController.js";

const router = express.Router();

router.post("/signup", validationController.signup(), indexController.signup);

export default router;
