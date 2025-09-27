import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma-client.js";
import { succSignIn, newUser } from "./utils/testUtils.js";
import "dotenv";
import jwt from "jsonwebtoken";
import { response } from "express";

beforeEach(async () => {
  // Reset DB
  await prisma.messageRecipient.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  // Exit the db cleanly
  await prisma.$disconnect();
});

describe("App Tests", () => {
  describe("Authentication API", () => {
    describe("Signup Route", () => {
      it("returns 201 and a JWT with successful signup", async () => {
        const userSignUp = newUser();
        const res = await request(app)
          .post("/signup")
          .send(userSignUp)
          .expect(201); // check if response is a success first

        expect(res.body.data).toHaveProperty("token");
        expect(typeof res.body.data.token).toBe("string");

        // Normalise the email to pick up user
        const normalisedEmail = userSignUp.email.toLowerCase();

        // Check that user is created in DB
        const userInDB = await prisma.user.findUnique({
          where: {
            email: normalisedEmail,
          },
        });
        expect(userInDB).not.toBeNull();

        // Check that password isn't stored in plaintext
        expect(userInDB.password).not.toBe(newUser.password);

        // Check that password is bcrypt hashed
        expect(userInDB.password).toMatch(/^\$2[ayb]\$.{56}$/);
      });
      it("returns 400 with missing fields", async () => {
        const res = await request(app).post("/signup").expect(400);
      });
      it("returns 400 with a first_name not meeting validation", async () => {
        // first_name contains a non-alpha character
        const userIncFirst = newUser({ first_name: "testFirst@" });

        const res = await request(app)
          .post("/signup")
          .send(userIncFirst)
          .expect(400);
      });
      it("returns 400 with last_name not meeting validation", async () => {
        // last_name contains a non-alpha character
        const userIncLast = newUser({ last_name: "testSecond@" });

        const res = await request(app)
          .post("/signup")
          .send(userIncLast)
          .expect(400);
      });
      it("returns 400 with email not meeting validation", async () => {
        // email not an email
        const userIncEmail = newUser({ email: "testEmail@test" });
        const res = await request(app)
          .post("/signup")
          .send(userIncEmail)
          .expect(400);
      });
      it("returns 400 with password too short", async () => {
        const userShortPass = newUser({ password: "tPass1!" });

        const res = await request(app)
          .post("/signup")
          .send(userShortPass)
          .expect(400);
      });
      it("returns 400 with password no uppercase letter", async () => {
        const userNoUpper = newUser({ password: "testpassword1!" });

        const res = await request(app)
          .post("/signup")
          .send(userNoUpper)
          .expect(400);
      });
      it("returns 400 with password no lowercase letter", async () => {
        const userNoLower = newUser({ password: "TESTPASSWORD1!" });

        const res = await request(app)
          .post("/signup")
          .send(userNoLower)
          .expect(400);
      });
      it("returns 400 with password no number", async () => {
        const newNoNum = newUser({ password: "testPassword!" });

        const res = await request(app)
          .post("/signup")
          .send(newNoNum)
          .expect(400);
      });
      it("returns 400 with password no special character", async () => {
        const newNoSpecial = newUser({ password: "testPassword1" });

        const res = await request(app)
          .post("/signup")
          .send(newNoSpecial)
          .expect(400);
      });
      it("returns 400 with password mismatch", async () => {
        const newMismatch = newUser({
          password: "testPassword1!",
          confirmPassword: "testPassword1!!",
        });

        const res = await request(app)
          .post("/signup")
          .send(newMismatch)
          .expect(400);
      });
      it("returns 400 if email or username already exists", async () => {
        const { testUser } = await succSignIn(newUser);
        const secondUser = await request(app)
          .post("/signup")
          .send(testUser)
          .expect(400);
      });
    });
    describe("Login Route", () => {
      it("returns 400 if field is missing", async () => {
        const res = await request(app).post("/login").expect(400);
      });
      it("returns 401 if user can't be found", async () => {
        const notUser = {
          username: "TestUser",
          password: "testPassword1!",
        };

        const res = await request(app).post("/login").send(notUser).expect(401);
      });
      it("returns 401 if password incorrect", async () => {
        const { testUser } = await succSignIn(newUser);

        const wrongPassword = {
          username: testUser.username,
          password: "incorrectPassword1!",
        };

        const res = await request(app).post("/login").send(wrongPassword);
        expect(401);
      });
      it("returns 200 and JWT with correct credentials", async () => {
        const { testUser } = await succSignIn(newUser);

        const correctCredentials = {
          username: testUser.username,
          password: testUser.password,
        };

        const res = await request(app)
          .post("/login")
          .send(correctCredentials)
          .expect(200);

        // Check for the token
        expect(res.body.data).toHaveProperty("token");
        expect(typeof res.body.data.token).toBe("string");
      });
    });
  });
  describe("Authorisation API", () => {
    describe("JWT Auth", () => {
      it("rejects with 401 if no token", async () => {
        const res = await request(app).get("/auth/verify").expect(401);
      });
      it("rejects with 401 if token is invalid", async () => {
        const res = await request(app)
          .get("/auth/verify")
          .set("Authorization", `Bearer ${"test"}`)
          .expect(401);
      });
      it("rejects with 401 if token is expired", async () => {
        const { user } = await succSignIn(newUser);
        const expiredToken = jwt.sign({ userId: user.id }, process.env.SECRET, {
          expiresIn: -10,
        });

        const res = await request(app)
          .get("/auth/verify")
          .set("Authorization", `Bearer ${expiredToken}`)
          .expect(401);
      });
      it("continues to next middleware returning 200 with correct credentials", async () => {
        const { token } = await succSignIn(newUser);
        const res = await request(app)
          .get("/auth/verify")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
      });
    });
  });
  describe("Messages API", () => {
    describe("POST /message/:receiverId", () => {
      it("Rejects if sender isn't authenticated with 401", async () => {
        const res = await request(app).post("/message/1234").expect(401);
      });
      // it("Rejects if receiver doesnt exist with 404", async () => {
      //   const res = await response(app).post("/message/");
      // });
    });
  });
});
