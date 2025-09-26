import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma-client.js";
import { succSignIn, newUser } from "./utils/testUtils.js";

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

describe("Auth API", () => {
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
      console.log(res.body);
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

      const res = await request(app).post("/signup").send(newNoNum).expect(400);
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
      const { user } = await succSignIn(newUser);

      const wrongPassword = {
        username: user.username,
        password: "incorrectPassword1!",
      };

      const res = await request(app)
        .post("/login")
        .send(wrongPassword)
        .expect(401);
    });
    it("returns 200 with correct credentials", async () => {
      const { user } = await succSignIn(newUser);

      const correctCredentials = {
        username: user.username,
        password: user.password,
      };

      const res = await request(app)
        .post("/login")
        .send(correctCredentials)
        .expect(200);
    });
  });
});
