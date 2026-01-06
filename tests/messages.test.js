import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma-client.js";
import {
  succSignIn,
  newUser,
  fullDBSetup,
  dbKnowMessages,
  dbKnowSendReceive,
} from "./utils/testUtils.js";
import "dotenv";
import jwt from "jsonwebtoken";
import { response } from "express";
import { faker } from "@faker-js/faker";

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
      const { user: user2 } = await succSignIn(newUser);
      const res = await request(app)
        .post(`/message/${user2.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: "" })
        .expect(400);
    });
    it("Rejects if message is too long with 400", async () => {
      const { token } = await succSignIn(newUser);
      const { user: user2 } = await succSignIn(newUser);
      const longString = faker.string.alpha(
        Number(process.env.MAX_MSG_LENGTH) + 1
      );
      const res = await request(app)
        .post(`/Message/${user2.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: longString })
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
        expect(messageInDB[0]).toBeDefined();
      });
      it("Message in DB has content and senderId", async () => {
        const { token, user: user1 } = await succSignIn(newUser);
        const { user: user2 } = await succSignIn(newUser);
        const message = "message";
        const res = await request(app)
          .post(`/message/${user2.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: message })
          .expect(201);

        const messageInDB = await prisma.message.findMany({});
        expect(messageInDB[0].content).toBe(message);
        expect(messageInDB[0].senderId).toBe(user1.id);
      });
      it("Message stores correct date", async () => {
        const { token } = await succSignIn(newUser);
        const { user: user2 } = await succSignIn(newUser);
        const oldDate = new Date();

        const res = await request(app)
          .post(`/message/${user2.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: "test" });

        const messageInDB = await prisma.message.findMany({});
        const newDate = new Date();
        const newerThan = messageInDB[0].createdAt > oldDate;
        const olderThan = messageInDB[0].createdAt < newDate;
        expect(newerThan).toBe(true);
        expect(olderThan).toBe(true);
      });
      it("Message recipient stored correctly", async () => {
        const { token } = await succSignIn(newUser);
        const { user: user2 } = await succSignIn(newUser);

        const res = await request(app)
          .post(`/message/${user2.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ message: "test" });

        const messageInDB = await prisma.message.findMany({
          include: {
            sender: true,
            recipients: true,
          },
        });
        expect(messageInDB[0].recipients[0].userId).toEqual(user2.id);
      });
    });
  });
  describe("GET /my-messages", () => {
    // This tests if our user is the recipient of all messages
    it("Returns list of users you've messaged with the latest message for each with 200 - if our user is the recipient of all messages", async () => {
      const fakeUname = "myMessagesTest123!";
      const fakePword = "myPasswordTest123!";
      // Add test users and messages to the DB - should be enough!
      // await fullDBSetup(25, 500, fakeUname, fakePword);
      await dbKnowMessages(25, fakeUname, fakePword);
      // Logging in a user who should have sent and received messages
      const loggedIn = await request(app).post("/login").send({
        username: fakeUname,
        password: fakePword,
      });
      const res = await request(app)
        .get("/my-messages")
        .set("Authorization", `Bearer ${loggedIn.body.data.token}`)
        .expect(200);

      expect(res.body.data.conversations).toBeDefined();
      expect(res.body.data.conversations.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(res.body.data.conversations[i]).toHaveProperty("senderId");
        expect(res.body.data.conversations[i]).toHaveProperty("recipientId");
        expect(res.body.data.conversations[i]).toHaveProperty("otherUserId");
        expect(res.body.data.conversations[i].otherUserId).not.toBe(
          res.body.data.user.id
        );
        expect(res.body.data.conversations[i]).toHaveProperty("createdAt");
        expect(res.body.data.conversations[i]).toHaveProperty("content");
        expect(res.body.data.conversations[i].content).toEqual(
          `testMessage${24 - i}`
        );
      }
    });
    // This tests if our there are some messages back and forth in a chat
    it("Returns list of users you've messaged with the latest message for each with 200 - if our user sends and receives", async () => {
      const fakeUname = "myMessagesTest123!";
      const fakePword = "myPasswordTest123!";
      await dbKnowSendReceive(fakeUname, fakePword);
      // Logging in the user
      const loggedIn = await request(app).post("/login").send({
        username: fakeUname,
        password: fakePword,
      });
      const res = await request(app)
        .get("/my-messages")
        .set("Authorization", `Bearer ${loggedIn.body.data.token}`)
        .expect(200);

        expect(res.body.data.conversations).toBeDefined();
        expect(res.body.data.conversations.length).toBe(10);
        for (let i = 0; i < 10; i++) {
        expect(res.body.data.conversations[i]).toHaveProperty("senderId");
        expect(res.body.data.conversations[i]).toHaveProperty("recipientId");
        expect(res.body.data.conversations[i]).toHaveProperty("otherUserId");
        expect(res.body.data.conversations[i].otherUserId).not.toBe(
          res.body.data.user.id
        );
      }
    })
  });
});
