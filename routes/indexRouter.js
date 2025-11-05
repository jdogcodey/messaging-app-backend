import express from "express";
import indexController from "../controllers/indexController.js";
import validationController from "../controllers/validationController.js";
import authController from "../controllers/authController.js";
import confirmUserController from "../controllers/confirmUserController.js";
import validationErrorController from "../controllers/validationErrorsController.js";

const router = express.Router();

router.post(
  "/signup",
  validationController.signup(),
  validationErrorController,
  indexController.signup
);

router.post(
  "/login",
  validationController.login(),
  validationErrorController,
  indexController.login
);

router.get("/auth/verify", authController.jwtAuth, indexController.getUser);

router.post(
  "/message/:receiverId",
  validationController.message(),
  authController.jwtAuth,
  confirmUserController,
  indexController.postMessage
);

export default router;
