import express from "express";
import indexController from "../controllers/indexController.js";
import validationController from "../controllers/validationController.js";
import authController from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", validationController.signup(), indexController.signup);

router.post("/login", validationController.login(), indexController.login);

router.get("/auth/verify", authController.jwtAuth);

export default router;
