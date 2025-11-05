import { validationResult } from "express-validator";

export default function validationErrorController(req, res, next) {
  const errors = validationResult(req).array();
  // Returning these errors so sign up form is correctly filled by front end
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Please fix the highlighted field",
      errors: errors,
    });
  } else next();
}
