import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma-client.js";
import jwt from "jsonwebtoken";
import "dotenv";
import passport from "passport";
import "../config/passport.js";
import validationErrorController from "./validationErrorsController.js";

const indexController = {
  signup: async (req, res, next) => {
    // Takes the sign up POST request, validates the form, checks if the user already exists, then creates the user returning 201 on success

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
  getUser: (req, res, next) => {
    res.status(200).json({
      success: true,
      message: "Authorised",
    });
  },
  postMessage: async (req, res, next) => {
    if (req.params.receiverId === req.user.id) {
      res.status(400).json({
        success: false,
        message: "Do you have no friends?",
      });
    } else {
      try {
        const messageInDB = await prisma.message.create({
          data: {
            content: req.body.message,
            senderId: req.user.id,
          },
        });
        await prisma.messageRecipient.create({
          data: {
            userId: req.params.receiverId,
            messageId: messageInDB.id,
          },
        });
        res.status(201).json({
          success: true,
          message: "Message sent",
        });
      } catch {
        res.status(500).json({
          success: false,
          message: "Computer says no",
        });
      }
    }
  },
  getMyMessages: async (req, res, next) => {
    const userId = req.user.id;
    const messageList = await prisma.$queryRaw`
    WITH all_pairs AS (
      SELECT
        m.id AS "messageId",
        m.content,
        m."createdAt",
        m."senderId",
        mr."userId" AS "recipientId",
        CASE 
          WHEN m."senderId" = ${userId} THEN mr."userId"
          ELSE m."senderId"
        END AS "otherUserId"
      FROM "Message" m
      JOIN "MessageRecipient" mr ON mr."messageId" = m.id
      WHERE m."senderId" = ${userId} OR mr."userId" = ${userId}
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY "otherUserId"
          ORDER BY "createdAt" DESC 
        ) AS rn
      FROM all_pairs
    )
    SELECT 
      "messageId",
      content,
      "createdAt",
      "senderId",
      "recipientId",
      "otherUserId"
    FROM ranked 
    WHERE rn = 1
    ORDER BY "createdAt" DESC
    LIMIT 10;
`;
    res.status(200).json({
      success: true,
      message: "Message request successful",
      data: {
        conversations: messageList,
        user: {
          id: req.user.id,
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          username: req.user.username,
          email: req.user.email,
        },
      },
    });
  },
  getConvo: async (req, res, next) => {
    const ourUser = req.user.id;
    const otherUser = req.params.userId;
    const messages = await prisma.message.findMany({
      take: 10,
      where: {
        OR: [
          {
            senderId: ourUser,
            recipients: {
              some: {
                userId: otherUser,
              }
            }
          },
          {
            senderId: otherUser,
            recipients: {
              some: {
                userId: ourUser,
              }
            }
          }
        ]
      }
    })
    res.status(200).json({
      success: true,
      message: "Conversation request successful",
      data: {
        user: {
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          username: req.user.username,
          email: req.user.email,
        },
        messages: messages,
      }
    })
  },
};

export default indexController;
