import express from "express";
import indexController from "../controllers/indexController.js";
import validationController from "../controllers/validationController.js";
import authController from "../controllers/authController.js";
import confirmUserController from "../controllers/confirmUserController.js";

const router = express.Router();

router.post("/signup", validationController.signup(), indexController.signup);

router.post("/login", validationController.login(), indexController.login);

router.get("/auth/verify", authController.jwtAuth, indexController.getUser);

router.post(
  "/message/:receiverId",
  authController.jwtAuth,
  confirmUserController,
  indexController.postMessage
);

export default router;
