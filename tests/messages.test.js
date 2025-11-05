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
      const res = await request(app)
        .post("/message/1234")
        .send({ message: "test" })
        .expect(401);
    });
    it("Rejects if receiver not given with 404", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post("/message/")
        .set("Authorization", `Bearer ${token}`)
        .send({ message: "test" })
        .expect(404);
    });
    it("Rejects if receiver doesn't exist with 404", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post("/message/475768")
        .set("Authorization", `Bearer ${token}`)
        .send({ message: "test" })
        .expect(404);
    });
    it("Rejects if sender is same as receiver with 400", async () => {
      const { token, user } = await succSignIn(newUser);
      const res = await request(app)
        .post(`/message/${user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: "test" })
        .expect(400);
    });
    it("Rejects if message is empty with 400", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post(`/message/123456789`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: "" })
        .expect(400);
    });
    describe("Creates message between valid sender and receiver with 201", () => {
      it("201 if sender and receiver are valid and message has content", async () => {
        const { token } = await succSignIn(newUser);
        const { user } = await succSignIn(newUser);
        const res = await request(app)
          .post(`/message/${user.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: "test" })
          .expect(201);
      });
    });
  });
});
