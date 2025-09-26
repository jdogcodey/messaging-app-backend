import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma-client.js";

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
      const newUser = {
        first_name: "testFirst",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "testPassword1!",
        confirmPassword: "testPassword1!",
      };
      const res = await request(app).post("/signup").send(newUser).expect(201); // check if response is a success first

      expect(res.body.data).toHaveProperty("token");
      expect(typeof res.body.data.token).toBe("string");

      // Normalise the email to pick up user
      const normalisedEmail = newUser.email.toLowerCase();

      // Check that user is created in DB
      const userInDB = await prisma.user.findUnique({
        where: {
          email: normalisedEmail,
        },
      });
      console.log(userInDB);
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
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "testPassword1!",
        confirmPassword: "testPassword1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with last_name not meeting validation", async () => {
      // last_name contains a non-alpha character
      const newUser = {
        first_name: "testFirst",
        last_name: "testSecond@",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "testPassword1!",
        confirmPassword: "testPassword1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with email not meeting validation", async () => {
      // email not an email
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test",
        password: "testPassword1!",
        confirmPassword: "testPassword1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with password too short", async () => {
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "tPass1!",
        confirmPassword: "tPass1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with password no uppercase letter", async () => {
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "testpassword1!",
        confirmPassword: "testpassword1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with password no lowercase letter", async () => {
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "TESTPASSWORD1!",
        confirmPassword: "TESTPASSWORD1!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
    it("returns 400 with password no number", async () => {
      const newUser = {
        first_name: "testFirst@",
        last_name: "testSecond",
        username: "testUsername",
        email: "testEmail@test.com",
        password: "testPassword!",
        confirmPassword: "testPassword!",
      };

      const res = await request(app).post("/signup").send(newUser).expect(400);
    });
  });
});
