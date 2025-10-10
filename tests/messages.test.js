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

describe("Messages API", () => {
  describe("POST /message/:receiverId", () => {
    it("Rejects if sender isn't authenticated with 401", async () => {
      const res = await request(app).post("/message/1234").expect(401);
    });
    it("Rejects if receiver not given with 404", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post("/message/")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
    it("Rejects if receiver doesn't exist with 404", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post("/message/475768")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });
});
