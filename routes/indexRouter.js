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
  indexController.signup,
);

router.post(
  "/login",
  validationController.login(),
  validationErrorController,
  indexController.login,
);

router.get("/auth/verify", authController.jwtAuth, indexController.getUser);

router.post(
  "/message/:receiverId",
  validationController.message(),
  validationErrorController,
  authController.jwtAuth,
  confirmUserController,
  indexController.postMessage,
);

router.get(
  "/my-messages",
  authController.jwtAuth,
  indexController.getMyMessages,
);

router.get("/convo/:userId", authController.jwtAuth, indexController.getConvo);

router.get(
  "/user-search",
  validationController.userSearch(),
  validationErrorController,
  authController.jwtAuth,
  indexController.userSearch,
);

router.post(
  "/friend-request/new/:userId",
  authController.jwtAuth,
  indexController.postFriendRequest,
);

router.get(
  "/friend-request/received",
  authController.jwtAuth,
  indexController.getFriendRequest,
);

router.get(
  "/friend-request/sent",
  authController.jwtAuth,
  indexController.getFriendRequestSent,
);

router.patch(
  "/friend-request/:requestId",
  validationController.patchFriendRequest(),
  validationErrorController,
  authController.jwtAuth,
  indexController.patchFriendRequest,
);

router.get("/friends", authController.jwtAuth, indexController.getFriends);

router.patch(
  "/users/profile",
  authController.jwtAuth,
  indexController.patchUserProfile,
);

export default router;
