import express from "express";
import indexController from "../controllers/indexController.js";
import validationController from "../controllers/validationController.js";

const router = express.Router();

router.post("/signup", validationController.signup(), indexController.signup);

router.post("/login", validationController.login(), indexController.login);

export default router;
