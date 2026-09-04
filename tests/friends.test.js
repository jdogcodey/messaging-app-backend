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
  dbFirstLastNameSearch,
  dbWholeUserSearch,
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
          .query({ search: '123' })
          .expect(401);
      })
      it("Rejects with 400 if no search sent", async () => {
          const { token } = await succSignIn(newUser)
          const res = await request(app)
          .get('/user-search')
          .set('Authorization', `Bearer ${token}`)
          .expect(400)
      })
      it("Excludes your own account from results with 200", async () => {
        const { token, user } = await succSignIn(newUser)
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: user.first_name })
        .expect(200)
        
        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults.length).toBe(0)
      })
      it("Returns empty array if no matches with 200", async () => {
        const { token } = await succSignIn(newUser)
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'nothingToSeeHere' })
        .expect(200)

        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults).toEqual([])
        expect(res.body.data.searchResults.length).toBe(0)
      })
      it("Searches first names - exact match", async () => {
          const { token } = await succSignIn(newUser) 
          const nameList = ['Steve', 'Steve', 'Steve', 'Sharon', 'Bob', 'Doris', 'Steve'];
          await dbFirstNameSearch(nameList)
          const res = await request(app)
          .get('/user-search')
          .set("Authorization", `Bearer ${token}`)
          .query({ search: 'Steve' })
          .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(4)
        results.forEach((user) => {
          expect(user.first_name).toBe('Steve')
        })
      })
      it("Searches first names - case changes", async () => {
          const { token } = await succSignIn(newUser) 
          const nameList = ['BOBBY', 'BoBBY', 'bobbY', 'Sharon', 'Bob', 'Doris', 'BobBy'];
          await dbFirstNameSearch(nameList)
          const res = await request(app)
          .get('/user-search')
          .set("Authorization", `Bearer ${token}`)
          .query({ search: 'bobby' })
          .expect(200);
        
        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(4)
        results.forEach((user) => {
          expect(user.first_name.toLowerCase()).toBe('bobby')
        })
      })
      it("Searches first names - partial beginning match", async () => {
          const { token } = await succSignIn(newUser) 
          const nameList = ['BOBBY', 'BoBBY', 'bobbY', 'Sharon', 'Bob', 'Doris', 'BobBy'];
          await dbFirstNameSearch(nameList)
          const res = await request(app)
          .get('/user-search')
          .set("Authorization", `Bearer ${token}`)
          .query({ search: 'bo' })
          .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(5)
        
        results.forEach(user => {
          expect(user.first_name.toLowerCase()).toContain('bo')
        })
      })
      it("Searches last names", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['Smith', 'Potter', 'Smith', 'Weasley', 'Malfoy', 'Smith'];
        await dbLastNameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'Smith'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(3)
        results.forEach((user) => {
          expect(user.last_name).toBe('Smith')
        })
      })
      it("Searches last names - case changes", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['SMITH', 'Potter', 'SmItH', 'Weasley', 'Malfoy', 'smith'];
        await dbLastNameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'Smith'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(3)
        results.forEach((user) => {
          expect(user.last_name.toLowerCase()).toBe('smith')
        })
      })
      it("Searches last names - partial beginning match", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['Smith', 'Potter', 'Smith', 'Weasley', 'Malfoy', 'Smith', 'Smiith', 'Smity'];
        await dbLastNameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'Smit'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(4)
        results.forEach((user) => {
          expect(user.last_name.toLowerCase()).toContain('smit');
        })
      })
      it("Searches usernames", async () => {
        const { token } = await succSignIn(newUser)
        const nameList = ['testUser1', '2testUser', '3user', '4user', '5user', 'testUser6', '7testUser'];
        await dbUsernameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'testUser'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results).toBeDefined()
        expect(results.length).toBe(4)
        results.forEach((user) => {
          expect(user.username).toContain('testUser');
        })
      })
      it("Searches usernames ignoring spaces", async () =>{
        const { token } = await succSignIn(newUser)
        const nameList = ['testUser1', '1testuser', '1test2us3er', '123test', '12testUser23']
        await dbUsernameSearch(nameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'test us er' })
        .expect(200);
        expect(res.body.data.searchResults.length).toBe(3)
      })
      it("Searches with a space don't combine and search first or last", async () => {
        const { token } = await succSignIn(newUser)
        const firstList = ['John', 'JohnSmith', 'Johnny', 'Johnathan', 'JohnSmithhy']
        await dbFirstNameSearch(firstList)
        const lastList = ['Smith', 'Smithy', 'JohnSmith', 'JohnSmithy', 'John']
        await dbLastNameSearch(lastList)
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John Smith' })
        .expect(200)
        expect(res.body.data.searchResults.length).toBe(0) // Should be searching for first:'John' AND last: 'Smith' so none should meet this
      })
      it("Searches usernames, first and last and mixed", async () => {
        const { token } = await succSignIn(newUser)
        const usernameList = ['testUser1', '2testUser', '3user', '4user', '5user', 'testUser6', '7testUser'];
        await dbUsernameSearch(usernameList);
        const namesList = [{first_name: 'John', last_name: 'Smith'}, {first_name: 'Test', last_name: 'Nope'}, {first_name: 'Nah', last_name: 'User'}, {first_name: 'test', last_name: 'user'}, {first_name: 'testthis', last_name: 'user'}]
        await dbFirstLastNameSearch(namesList)
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'test User'})
        .expect(200);
        expect(res.body.data.searchResults).toBeDefined()
        expect(res.body.data.searchResults.length).toBe(6)
      })
      it("Searches first and last combined", async () => {
        const { token } = await succSignIn(newUser)
        const userList = [{first_name: 'John', last_name: 'Smith'}, {first_name: 'John', last_name: 'Henry'}, {first_name: 'John', last_name: 'Peters'}, {first_name: 'Johnny', last_name: 'Smith'}, {first_name: 'James', last_name: 'Smith'}, {first_name: 'Fred', last_name: 'Smith'}];
        await dbFirstLastNameSearch(userList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John Smith'})
        .expect(200);
        expect(res.body.data.searchResults.length).toBe(2)
      })
      it("Prioritises username with single search query", async () => {
        const { token } = await succSignIn(newUser)
        const matchingUsernames = ['John123', '123John', '1John1']
        await dbUsernameSearch([...matchingUsernames, '1SteveJoh']);
        const userList = [{first_name: 'John', last_name: 'Smith'}, {first_name: 'John', last_name: 'Johnson'}, {first_name: 'Steve', last_name: 'John'}, {first_name: 'Nah', last_name: 'Notme'}];
        await dbFirstLastNameSearch(userList)
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John'})
        .expect(200);
        const results = res.body.data.searchResults;
        expect(results.length).toBe(6)

        const prioritisedUsernameResults = results.slice(0, 3).map(r => r.username);
        matchingUsernames.forEach((username) => {
          expect(prioritisedUsernameResults).toContain(username)
        })

        const remainingNameResults = results.slice(3);
        remainingNameResults.forEach((user) => {
          const firstNameMatch = user.first_name.toLowerCase().includes('john');
          const lastNameMatch = user.last_name.toLowerCase().includes('john');
          expect(firstNameMatch || lastNameMatch).toBe(true)
        })
      })
      it("Prioritises first&last with dual search query", async () => {
        const { token } = await succSignIn(newUser);
        const userList = [{first_name: 'John', last_name: 'Smith'}, {first_name: 'Johnathan', last_name: 'Smithy'}, {first_name: 'JJohn', last_name: 'SSSSmith'}, {first_name: 'NotMe', last_name: 'JohnSmith'}];
        await dbFirstLastNameSearch(userList)
        const usernameList = ['JohnSmith', 'JJJJohnSmith123', 'JohnSmith123'];
        await dbUsernameSearch(usernameList);
        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John Smith'})
        .expect(200);
        const results = res.body.data.searchResults;
        expect(results.length).toBe(5)
        
        const nameResults = results.slice(0, 2);
        nameResults.forEach((user) => {
          const firstNameMatch = user.first_name.toLowerCase().includes('john');
          const lastNameMatch = user.last_name.toLowerCase().includes('smith');
          expect(firstNameMatch && lastNameMatch).toBe(true)
        })

         const usernameResults = results.slice(2).map(r => r.username);
        usernameList.forEach((username) => {
          expect(usernameResults).toContain(username)
        })
      })
      it("Result caps at 10", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = ['John', 'John1', 'John2', 'John3', 'John4', 'John5', 'John6', 'John7', 'John8', 'John9', 'John10', 'John11', 'John12', 'John13', 'John14', 'John15'];
        await dbUsernameSearch(usernameList);

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results.length).toBe(10)
      })
      it("No duplicate if first&last = username", async () => {
        const { token } = await succSignIn(newUser);
        await dbWholeUserSearch({first_name: 'John', last_name: 'Smith', username: 'JohnSmith'})

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John Smith'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results.length).toBe(1)
      })
      it("No duplicate flipped", async () => {
        const { token } = await succSignIn(newUser);
        await dbWholeUserSearch({first_name: 'John', last_name: 'Smith', username: 'JohnSmith'})

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'JohnSmith'})
        .expect(200);

        const results = res.body.data.searchResults;

        expect(results.length).toBe(1)
      })
      it("Whitespace sanitation", async () => {
        const { token } = await succSignIn(newUser);
        await dbFirstLastNameSearch([{first_name: 'John', last_name: 'Smith'}])

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: '          John         Smith      '})
        .expect(200);

        const results = res.body.data.searchResults;
        expect(results.length).toBe(1)
      })
      it("Special characters & symbols handled correctly", async () => {
        const { token } = await succSignIn(newUser);
        await dbFirstLastNameSearch([{first_name: 'John', last_name: 'Smith'}])

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'John:*'})
        .expect(200);

        const results = res.body.data.searchResults;
        expect(results.length).toBe(0)
      })
      it("Special characters handled correctly in username", async () => {
        const { token } = await succSignIn(newUser);
        await dbUsernameSearch(['1!~John*&%$#@()']);

        const res = await request(app)
        .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: '1!~John*&%$#@()'})
        .expect(200);

        const results = res.body.data.searchResults;
        expect(results.length).toBe(1)
      })
      it("Reverse name search", async () => {
        const { token } = await succSignIn(newUser);
        await dbFirstLastNameSearch([{ first_name: 'John', last_name: 'Smith' }])

        const res = await request(app)
          .get('/user-search')
        .set("Authorization", `Bearer ${token}`)
        .query({ search: 'Smith John'})
        .expect(200);

        const results = res.body.data.searchResults;
        expect(results.length).toBe(1)
      })
    })
})