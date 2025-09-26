import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma-client.js";
import jwt from "jsonwebtoken";
import "dotenv";

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

    try {
      // Confirming the passwords match (will also check front end but incase this has failed)
      if (password !== confirmPassword) {
        return res.status(401).json({
          success: false,
          message: "Passwords do not match",
          errors: {
            password: "Password and confirm-password do not match",
          },
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
};

export default indexController;
