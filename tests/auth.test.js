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
  });
});
