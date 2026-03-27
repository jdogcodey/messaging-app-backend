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
  dbMessageHistoryConvo,
  dbFirstNameSearch,
  dbLastNameSearch,
  dbUsernameSearch,
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
          .expect(401);
        })
        it("Rejects with 400 if no search sent", async () => {
          const { token } = await succSignIn(newUser)
          const res = await request(app)
          .get('/user-search')
          .set('Authorization', `Bearer ${token}`)
          .expect(400)
        })
        it("Searches first names", async () => {
          const { token } = await succSignIn(newUser) 
          const nameList = ['Steve', 'Steve', 'Steve', 'Sharon', 'Bob', 'Doris', 'Steve'];
          await dbFirstNameSearch(nameList)
          const res = await request(app)
          .get('/user-search')
          .set("Authorization", `Bearer ${token}`)
          .send({ search: 'Steve' })
          .expect(200);

        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults.length).toBe(4)
        for (let i = 0; i < 4; i++) {
          expect(res.body.data.searchResults[i].first_name).toBe('Steve')
        }
        })
      it("Searches last names", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['Smith', 'Potter', 'Smith', 'Weasley', 'Malfoy', 'Smith'];
        await dbLastNameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .send({ search: 'Smith'})
        .expect(200);

        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults.length).toBe(3)
        for (let i = 0; i < 3; i++) {
          expect(res.body.data.searchResults[i].last_name).toBe('Smith')
        }
      })
      it("Searches usernames", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['testUser1', '2testUser', '3user', '4user', '5user', 'testUser6', '7testUser'];
        await dbUsernameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .send({ search: 'testUser'})
        .expect(200);

        console.log(res.body.data.searchResults)
        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults.length).toBe(4)
        for (let i = 0; i < 3; i++) {
          expect(res.body.data.searchResults[i].username).toContain('testUser')
        }
      })
      // it("Searches usernames, first and last and mixed", async () => {
      //   const { token } = await succSignIn(newUser)
      //   const usernameList = ['testUser1', '2testUser', '3user', '4user', '5user', 'testUser6', '7testUser'];
      //   await dbUsernameSearch(usernameList);
      //   const firstList = ['Test', 'Jest', 'Messed', 'Test', 'test', 'user', 'User']
      //   await dbFirstNameSearch(firstList)
      //   const lastList = ['user', 'Userpls', 'notuse', 'testing', 'uSeR']
      //   await dbLastNameSearch(lastList)
      //   const res = await request(app)
      //   .get('/user-search')
      //   .set("Authorization", `Bearer ${token}`)
      //   .send({ search: 'test User'})
      //   .expect(200);

      //   console.log(res.body.data.searchResults)
      //   console.log(res.body.data.searchResults)
      //   expect(res.body.data.searchResults).toBeDefined()
      //   expect(res.body.data.searchResults.length).toBe(10)
      // })
    })
})