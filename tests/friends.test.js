import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma-client.js";
import {
  succSignIn,
  newUser,
  fullDBSetup,
  dbKnowMessages,
  dbKnowSendReceive,
  dbMessageHistory,
  dbMessageHistoryConvo
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

describe("Friends API", () => {
    describe("GET /user-search", () => {
        it("Rejects with 401 if unauthenticated", async () => {
          const res = await request(app)
          .get('/user-search')
          .send({ search: '123' })
          .expect(404);
        })
    })
})