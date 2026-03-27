import { body } from "express-validator";
import "dotenv";

const validationController = {
  signup: () => [
    body("first_name")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isAlpha()
      .withMessage("First name must only contain letters")
      .escape(),
    body("last_name")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isAlpha()
      .withMessage("Last name must only contain letters")
      .escape(),
    body("username").trim().notEmpty().withMessage("Username is required").escape(),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Must be a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number")
      .matches(/[@$!%*?&]/)
      .withMessage(
        "Password must contain at least one special character (@$!%*?&)"
      )
      .not()
      .isIn(["password", "123456", "qwerty"])
      .withMessage("Password is too common")
      .trim()
      .escape(),
    body("confirmPassword").escape().custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
  ],
  login: () => [
    body("username").trim().notEmpty().withMessage("Username is required").escape(),
    body("password").notEmpty().withMessage("Password is required").escape(),
  ],
  message: () => [
    body("message")
      .notEmpty()
      .withMessage("What have you got to say for yourself?")
      .isLength({ max: Number(process.env.MAX_MSG_LENGTH) })
      .withMessage("Too much waffle")
      .escape(),
  ],
  userSearch: () => [
    body("search")
      .notEmpty()
      .withMessage("Can't search nothing!")
      .isLength({ max: 128 })
      .withMessage("Search too long. Try searching the exact username")
      .escape()
  ],
};

export default validationController;
