import request from "supertest";
import app from "../app.js";
import { succSignIn, newUser } from "./utils/testUtils.js";
import "dotenv";
import jwt from "jsonwebtoken";
import { response } from "express";
import { db } from "../src/prisma/db.js";

beforeEach(async () => {
  // Reset DB
  await db.orm.public.MessageRecipient.where({}).deleteAll();
  await db.orm.public.Message.where({}).deleteAll();
  await db.orm.public.Friendship.where({}).deleteAll();
  await db.orm.public.User.where({}).deleteAll();
});

afterAll(async () => {
  // Exit the db cleanly
  await db.close();
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
