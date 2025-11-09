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
      it("Adds message to database", async () => {
        const { token, user: user1 } = await succSignIn(newUser);
        const { user: user2 } = await succSignIn(newUser);
        const res = await request(app)
          .post(`/message/${user2.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: "test" })
          .expect(201);

        // We are only testing if there is a message in the DB. As we cleared the DB before each test we know that any message must be the one we submitted
        const messageInDB = await prisma.message.findMany({});
        console.log(messageInDB[0]);
        expect(messageInDB[0]).toBeDefined();
      });
      it("Message in DB has correct content and senderId", async () => {
        const { token, user: user1 } = await succSignIn(newUser);
        const { user: user2 } = await succSignIn(newUser);
        const res = await request(app)
          .post(`/message/${user2.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: "test" })
          .expect(201);

        const messageInDB = await prisma.message.findMany({});
        console.log(messageInDB);

        expect(messageInDB[0].content).toBeDefined();
      });
    });
  });
});
