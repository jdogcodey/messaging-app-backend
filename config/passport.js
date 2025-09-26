import passport from "passport";
import prisma from "./prisma-client.js";
import bcrypt from "bcryptjs";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import "dotenv";

// Local Strategy for Logging in
const verifyCallback = async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });
    if (!user) {
      return done(null, false, { message: "Incorrect username" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
};

const localStrategy = new LocalStrategy(
  { usernameField: "username", passwordField: "password" },
  verifyCallback
);
passport.use("local", localStrategy);

// JWT Strategy for verifying tokens on protected routes
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET,
};

const jwtVerify = async (payload, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return done(null, false);
    }

    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
passport.use("jwt", jwtStrategy);
