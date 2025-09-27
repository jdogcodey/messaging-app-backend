import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma-client.js";
import jwt from "jsonwebtoken";
import "dotenv";
import passport from "passport";
import "../config/passport.js";

const indexController = {
  signup: async (req, res, next) => {
    // Takes the sign up POST request, validates the form, checks if the user already exists, then creates the user returning 201 on success

    // Collecting the errors from the validation
    const errors = validationResult(req).array();

    // Returning these errors so sign up form is correctly filled by front end
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please fix the highlighted field",
        errors: errors,
      });
    }

    // Destructuring the form
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      confirmPassword,
    } = req.body;

    // Checking that a user with that email or username exists
    try {
      const checkForDuplicate = await prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: username }],
        },
      });

      // Return with 400 to user (could be 409 but this could expose that an email is signed up)
      if (checkForDuplicate) {
        let duplicateField =
          checkForDuplicate.email === req.body.email ? "email" : "username";
        return res.status(400).json({
          success: false,
          message: "Already have an account? Go to login",
        });
      }
      // Hashing the password for storage
      const hashedPassword = await bcrypt.hash(password, 10);

      // Adding the user to the database
      const newUser = await prisma.user.create({
        data: {
          first_name: first_name,
          last_name: last_name,
          username: username,
          email: email,
          password: hashedPassword,
        },
      });

      // Destructuring the password from the user
      const { password: _password, ...userWithoutPassword } = newUser;

      // Signing a token for the user
      const token = jwt.sign({ userId: newUser.id }, process.env.SECRET, {
        expiresIn: "1h",
      });

      // Returning the token to the user
      res.status(201).json({
        success: true,
        message: "Sign up successful",
        data: {
          token: token,
          user: userWithoutPassword,
        },
      });
    } catch (err) {
      // Error Handler
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server says no",
        errors: err,
      });
    }
  },
  login: async (req, res, next) => {
    // Collecting the errors from the validation
    const errors = validationResult(req).array();

    // Returning these errors so sign up form is correctly filled by front end
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please fix the highlighted field",
        errors: errors,
      });
    }

    passport.authenticate("local", { session: false }, (err, user, info) => {
      // Handles an error or no user
      if (err || !user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
          errors: err || errors,
        });
      }

      // Creates the payload of the userId
      const payload = { userId: user.id };

      // Uses this payload to sign a new token
      const token = jwt.sign(payload, process.env.SECRET, {
        expiresIn: "1h",
      });

      // Returns that the user has logged in - and provides them with the token we just created
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        },
      });
    })(req, res, next);
  },
};

export default indexController;
