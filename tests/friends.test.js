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
  dbKnownIDs,
} from "./utils/testUtils.js";
import "dotenv";
import jwt, { decode } from "jsonwebtoken";
import { response } from "express";
import { faker } from "@faker-js/faker";
import { encodeCursor, decodeCursor } from "../controllers/cursorController.js";

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
        .get("/user-search")
        .query({ search: "123" })
        .expect(401);
    });
    it("Rejects with 400 if no search sent", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
    });
    it("Excludes your own account from results with 200", async () => {
      const { token, user } = await succSignIn(newUser);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: user.first_name })
        .expect(200);

      expect(res.body.data.searchResults).toBeDefined();
      expect(res.body.data.searchResults.length).toBe(0);
    });
    it("Returns empty array if no matches with 200", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "nothingToSeeHere" })
        .expect(200);

      expect(res.body.data.searchResults).toBeDefined();
      expect(res.body.data.searchResults).toEqual([]);
      expect(res.body.data.searchResults.length).toBe(0);
    });
    it("Searches first names - exact match", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "Steve",
        "Steve",
        "Steve",
        "Sharon",
        "Bob",
        "Doris",
        "Steve",
      ];
      await dbFirstNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "Steve" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      results.forEach((user) => {
        expect(user.first_name).toBe("Steve");
      });
    });
    it("Searches first names - case changes", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "BOBBY",
        "BoBBY",
        "bobbY",
        "Sharon",
        "Bob",
        "Doris",
        "BobBy",
      ];
      await dbFirstNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "bobby" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      results.forEach((user) => {
        expect(user.first_name.toLowerCase()).toBe("bobby");
      });
    });
    it("Searches first names - partial beginning match", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "BOBBY",
        "BoBBY",
        "bobbY",
        "Sharon",
        "Bob",
        "Doris",
        "BobBy",
      ];
      await dbFirstNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "bo" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(5);

      results.forEach((user) => {
        expect(user.first_name.toLowerCase()).toContain("bo");
      });
    });
    it("Searches last names", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "Smith",
        "Potter",
        "Smith",
        "Weasley",
        "Malfoy",
        "Smith",
      ];
      await dbLastNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "Smith" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      results.forEach((user) => {
        expect(user.last_name).toBe("Smith");
      });
    });
    it("Searches last names - case changes", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "SMITH",
        "Potter",
        "SmItH",
        "Weasley",
        "Malfoy",
        "smith",
      ];
      await dbLastNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "Smith" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      results.forEach((user) => {
        expect(user.last_name.toLowerCase()).toBe("smith");
      });
    });
    it("Searches last names - partial beginning match", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "Smith",
        "Potter",
        "Smith",
        "Weasley",
        "Malfoy",
        "Smith",
        "Smiith",
        "Smity",
      ];
      await dbLastNameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "Smit" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      results.forEach((user) => {
        expect(user.last_name.toLowerCase()).toContain("smit");
      });
    });
    it("Searches usernames", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "testUser1",
        "2testUser",
        "3user",
        "4user",
        "5user",
        "testUser6",
        "7testUser",
      ];
      await dbUsernameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "testUser" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      results.forEach((user) => {
        expect(user.username).toContain("testUser");
      });
    });
    it("Searches usernames ignoring spaces", async () => {
      const { token } = await succSignIn(newUser);
      const nameList = [
        "testUser1",
        "1testuser",
        "1test2us3er",
        "123test",
        "12testUser23",
      ];
      await dbUsernameSearch(nameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "test us er" })
        .expect(200);
      expect(res.body.data.searchResults.length).toBe(3);
    });
    it("Searches with a space don't combine and search first or last", async () => {
      const { token } = await succSignIn(newUser);
      const firstList = [
        "John",
        "JohnSmith",
        "Johnny",
        "Johnathan",
        "JohnSmithhy",
      ];
      await dbFirstNameSearch(firstList);
      const lastList = ["Smith", "Smithy", "JohnSmith", "JohnSmithy", "John"];
      await dbLastNameSearch(lastList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John Smith" })
        .expect(200);
      expect(res.body.data.searchResults.length).toBe(0); // Should be searching for first:'John' AND last: 'Smith' so none should meet this
    });
    it("Searches usernames, first and last and mixed", async () => {
      const { token } = await succSignIn(newUser);
      const usernameList = [
        "testUser1",
        "2testUser",
        "3user",
        "4user",
        "5user",
        "testUser6",
        "7testUser",
      ];
      await dbUsernameSearch(usernameList);
      const namesList = [
        { first_name: "John", last_name: "Smith" },
        { first_name: "Test", last_name: "Nope" },
        { first_name: "Nah", last_name: "User" },
        { first_name: "test", last_name: "user" },
        { first_name: "testthis", last_name: "user" },
      ];
      await dbFirstLastNameSearch(namesList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "test User" })
        .expect(200);
      expect(res.body.data.searchResults).toBeDefined();
      expect(res.body.data.searchResults.length).toBe(6);
    });
    it("Searches first and last combined", async () => {
      const { token } = await succSignIn(newUser);
      const userList = [
        { first_name: "John", last_name: "Smith" },
        { first_name: "John", last_name: "Henry" },
        { first_name: "John", last_name: "Peters" },
        { first_name: "Johnny", last_name: "Smith" },
        { first_name: "James", last_name: "Smith" },
        { first_name: "Fred", last_name: "Smith" },
      ];
      await dbFirstLastNameSearch(userList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John Smith" })
        .expect(200);
      expect(res.body.data.searchResults.length).toBe(2);
    });
    it("Prioritises username with single search query", async () => {
      const { token } = await succSignIn(newUser);
      const matchingUsernames = ["John123", "123John", "1John1"];
      await dbUsernameSearch([...matchingUsernames, "1SteveJoh"]);
      const userList = [
        { first_name: "John", last_name: "Smith" },
        { first_name: "John", last_name: "Johnson" },
        { first_name: "Steve", last_name: "John" },
        { first_name: "Nah", last_name: "Notme" },
      ];
      await dbFirstLastNameSearch(userList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John" })
        .expect(200);
      const results = res.body.data.searchResults;
      expect(results.length).toBe(6);

      const prioritisedUsernameResults = results
        .slice(0, 3)
        .map((r) => r.username);
      matchingUsernames.forEach((username) => {
        expect(prioritisedUsernameResults).toContain(username);
      });

      const remainingNameResults = results.slice(3);
      remainingNameResults.forEach((user) => {
        const firstNameMatch = user.first_name.toLowerCase().includes("john");
        const lastNameMatch = user.last_name.toLowerCase().includes("john");
        expect(firstNameMatch || lastNameMatch).toBe(true);
      });
    });
    it("Prioritises first&last with dual search query", async () => {
      const { token } = await succSignIn(newUser);
      const userList = [
        { first_name: "John", last_name: "Smith" },
        { first_name: "Johnathan", last_name: "Smithy" },
        { first_name: "JJohn", last_name: "SSSSmith" },
        { first_name: "NotMe", last_name: "JohnSmith" },
      ];
      await dbFirstLastNameSearch(userList);
      const usernameList = ["JohnSmith", "JJJJohnSmith123", "JohnSmith123"];
      await dbUsernameSearch(usernameList);
      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John Smith" })
        .expect(200);
      const results = res.body.data.searchResults;
      expect(results.length).toBe(5);

      const nameResults = results.slice(0, 2);
      nameResults.forEach((user) => {
        const firstNameMatch = user.first_name.toLowerCase().includes("john");
        const lastNameMatch = user.last_name.toLowerCase().includes("smith");
        expect(firstNameMatch && lastNameMatch).toBe(true);
      });

      const usernameResults = results.slice(2).map((r) => r.username);
      usernameList.forEach((username) => {
        expect(usernameResults).toContain(username);
      });
    });
    it("Result caps at 10", async () => {
      const { token } = await succSignIn(newUser);
      const usernameList = [
        "John",
        "John1",
        "John2",
        "John3",
        "John4",
        "John5",
        "John6",
        "John7",
        "John8",
        "John9",
        "John10",
        "John11",
        "John12",
        "John13",
        "John14",
        "John15",
      ];
      await dbUsernameSearch(usernameList);

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results.length).toBe(10);
    });
    it("No duplicate if first&last = username", async () => {
      const { token } = await succSignIn(newUser);
      await dbWholeUserSearch({
        first_name: "John",
        last_name: "Smith",
        username: "JohnSmith",
      });

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John Smith" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results.length).toBe(1);
    });
    it("No duplicate flipped", async () => {
      const { token } = await succSignIn(newUser);
      await dbWholeUserSearch({
        first_name: "John",
        last_name: "Smith",
        username: "JohnSmith",
      });

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "JohnSmith" })
        .expect(200);

      const results = res.body.data.searchResults;

      expect(results.length).toBe(1);
    });
    it("Whitespace sanitation", async () => {
      const { token } = await succSignIn(newUser);
      await dbFirstLastNameSearch([{ first_name: "John", last_name: "Smith" }]);

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "          John         Smith      " })
        .expect(200);

      const results = res.body.data.searchResults;
      expect(results.length).toBe(1);
    });
    it("Special characters & symbols handled correctly", async () => {
      const { token } = await succSignIn(newUser);
      await dbFirstLastNameSearch([{ first_name: "John", last_name: "Smith" }]);

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "John:*" })
        .expect(200);

      const results = res.body.data.searchResults;
      expect(results.length).toBe(0);
    });
    it("Special characters handled correctly in username", async () => {
      const resUsernameSignUp = await request(app)
        .post("/signup")
        .send({
          first_name: "testFirst",
          last_name: "testSecond",
          username: `1!~John*&%$#@()`,
          email: `testEmail_JohnSmith@test.com`,
          password: "testPassword1!",
          confirmPassword: "testPassword1!",
        })
        .expect(201); // check if response is a success first

      const { token } = await succSignIn(newUser);

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "1!~John*&%$#@()" })
        .expect(200);

      const results = res.body.data.searchResults;
      expect(results.length).toBe(1);
      expect(results[0].username).toBe(`1!~John*&%$#@()`);
    });
    it("Reverse name search", async () => {
      const { token } = await succSignIn(newUser);
      await dbFirstLastNameSearch([{ first_name: "John", last_name: "Smith" }]);

      const res = await request(app)
        .get("/user-search")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: "Smith John" })
        .expect(200);

      const results = res.body.data.searchResults;
      expect(results.length).toBe(1);
    });
    describe("Pagination", () => {
      it("Defaults to cursor-based with 10 limit", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        for (let i = 0; i < 100; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .expect(200);

        expect(res.body.data.cursor).toBeDefined();
        expect(res.body.data.searchResults.length).toBe(10);

        // Decode the nextCursor
        const nextCursor = decodeCursor(res.body.data.cursor);

        expect(nextCursor.limit).toBe(10);
        expect(nextCursor.type).toBe("CURSOR");
        expect(nextCursor.id).toBeDefined();
        expect(nextCursor.id).toBe(res.body.data.searchResults[9].id);
      });
      it("Dynamically takes limit size", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        for (let i = 0; i < 100; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const cursor = {
          limit: 25,
        };

        const ourCursor = encodeCursor(cursor);

        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: ourCursor })
          .expect(200);

        expect(res.body.data.cursor).toBeDefined();
        expect(res.body.data.searchResults.length).toBe(25);

        const nextCursor = decodeCursor(res.body.data.cursor);

        expect(nextCursor.type).toBe("CURSOR");
        expect(nextCursor.limit).toBe(25);
      });
      it("Limit restricted to max 50", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        for (let i = 0; i < 100; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const cursor = {
          limit: "100",
        };

        const ourCursor = encodeCursor(cursor);

        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: ourCursor })
          .expect(200);

        const nextCursor = decodeCursor(res.body.data.cursor);

        expect(nextCursor).toBeDefined();
        expect(res.body.data.searchResults.length).toBe(50);
        expect(nextCursor.type).toBe("CURSOR");
        expect(nextCursor.limit).toBe(50);
      });
      it("Offset progresses as expected", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        for (let i = 0; i < 100; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const resP1cursor = encodeCursor({
          limit: "25",
          page: "1",
        });

        const resP1 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP1cursor })
          .expect(200);

        const resP1NextCursor = decodeCursor(resP1.body.data.cursor);

        expect(resP1.body.data.searchResults.length).toBe(25);
        expect(resP1NextCursor.page).toBe(2); // Next cursor so we want it to tell us to get second page
        expect(resP1NextCursor.limit).toBe(25);

        const resP2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP1.body.data.cursor })
          .expect(200);

        const resP2NextCursor = decodeCursor(resP2.body.data.cursor);

        expect(resP2.body.data.searchResults.length).toBe(25);
        expect(resP2NextCursor.page).toBe(3); // Next cursor so we want it to tell us to get second page
        expect(resP2NextCursor.limit).toBe(25);

        const resP3 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP2.body.data.cursor })
          .expect(200);

        const resP3NextCursor = decodeCursor(resP3.body.data.cursor);

        expect(resP3.body.data.searchResults.length).toBe(25);
        expect(resP3NextCursor.page).toBe(4); // Next cursor so we want it to tell us to get second page
        expect(resP3NextCursor.limit).toBe(25);

        const resP4 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP3.body.data.cursor })
          .expect(200);

        const resP4NextCursor = decodeCursor(resP4.body.data.cursor);

        expect(resP4.body.data.searchResults.length).toBe(25);
        expect(resP4NextCursor.page).toBe(5); // Next cursor so we want it to tell us to get second page
        expect(resP4NextCursor.limit).toBe(25);

        const combinedResults = [];
        combinedResults.push(
          ...resP1.body.data.searchResults,
          ...resP2.body.data.searchResults,
          ...resP3.body.data.searchResults,
          ...resP4.body.data.searchResults,
        );
        const combinedIDs = combinedResults.map(
          (searchResult) => searchResult.id,
        );
        expect(combinedIDs.length).toBe(100);
        let uniqueCombined = [...new Set(combinedIDs)];
        expect(uniqueCombined.length).toBe(100);
      });
      it("Cursor based progresses as expected", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        for (let i = 0; i < 100; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const resP1cursor = encodeCursor({
          limit: "25",
        });

        const resP1 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP1cursor })
          .expect(200);

        const resP1NextCursor = decodeCursor(resP1.body.data.cursor);

        expect(resP1.body.data.searchResults.length).toBe(25);
        expect(resP1NextCursor.type).toBe("CURSOR");
        expect(resP1NextCursor.limit).toBe(25);

        const resP2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP1.body.data.cursor })
          .expect(200);

        const resP2NextCursor = decodeCursor(resP2.body.data.cursor);

        expect(resP2.body.data.searchResults.length).toBe(25);
        expect(resP2NextCursor.type).toBe("CURSOR");
        expect(resP2NextCursor.limit).toBe(25);

        const resP3 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP2.body.data.cursor })
          .expect(200);

        const resP3NextCursor = decodeCursor(resP3.body.data.cursor);

        expect(resP3.body.data.searchResults.length).toBe(25);
        expect(resP3NextCursor.type).toBe("CURSOR");
        expect(resP3NextCursor.limit).toBe(25);

        const resP4 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: resP3.body.data.cursor })
          .expect(200);

        const resP4NextCursor = decodeCursor(resP4.body.data.cursor);

        expect(resP4.body.data.searchResults.length).toBe(25);
        expect(resP4NextCursor.type).toBe("CURSOR");
        expect(resP4NextCursor.limit).toBe(25);

        const combinedResults = [];
        combinedResults.push(
          ...resP1.body.data.searchResults,
          ...resP2.body.data.searchResults,
          ...resP3.body.data.searchResults,
          ...resP4.body.data.searchResults,
        );
        const combinedIDs = combinedResults.map(
          (searchResult) => searchResult.id,
        );
        expect(combinedIDs.length).toBe(100);
        let uniqueCombined = [...new Set(combinedIDs)];
        expect(uniqueCombined.length).toBe(100);
      });
      it("Returns an empty array when no more results exist", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 15 users to the DB
        for (let i = 0; i < 15; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        // Requesting the first 10 from the DB
        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .expect(200);

        expect(res.body.data.cursor).toBeDefined();
        expect(res.body.data.searchResults.length).toBe(10);

        // console.log(res.body.data.searchResults.map((result) => result.id));

        // Currently not decoding as I need it encoded in the next call
        const nextCursor = res.body.data.cursor;

        // console.log(decodeCursor(res.body.data.cursor));

        // Requesting the next 10
        const resP2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: nextCursor })
          .expect(200);

        // console.log(resP2.body.data.searchResults.map((result) => result.id));

        // Hopefully only get 5 back as that is all there is
        expect(resP2.body.data.searchResults.length).toEqual(5);

        const thirdCursor = resP2.body.data.cursor;

        // Requestig again to check if we get an empty results array
        const resP3 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: thirdCursor })
          .expect(200);

        // Checking if we get an empty results array and a null next cursor id
        expect(resP3.body.data.searchResults.length).toEqual(0);
        expect(decodeCursor(resP3.body.data.cursor).id).toEqual(null);
      });
      it("Handles invalid or corrupted base64 strings", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 10 users to the DB
        for (let i = 0; i < 10; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        // Requesting with an invalid cursor string
        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: "thisisnotacursor" })
          .expect(200);

        const decodedCursor = decodeCursor(res.body.data.cursor);

        expect(decodedCursor.type).toBe("CURSOR");
        expect(decodedCursor.limit).toBe(10);
      });
      it("Handles zero or negative page values", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 10 users to the DB
        for (let i = 0; i < 10; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const negativePageCursor = encodeCursor({
          page: -1,
        });

        // Requesting with a cursor with a negative page
        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: negativePageCursor })
          .expect(200);

        const decodedCursor = decodeCursor(res.body.data.cursor);

        expect(res.body.data.searchResults.length).toBe(10);
        expect(decodedCursor.type).toBe("OFFSET");
        expect(decodedCursor.page).toBe(2);

        const zeroPageCursor = encodeCursor({
          page: 0,
        });

        // Requesting with a cursor with a zero page
        const resZero = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: zeroPageCursor })
          .expect(200);

        const decodedCursorZero = decodeCursor(resZero.body.data.cursor);

        expect(resZero.body.data.searchResults.length).toBe(10);
        expect(decodedCursorZero.type).toBe("OFFSET");
        expect(decodedCursorZero.page).toBe(2);
      });
      it("Final offset page handled appropriately", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 15 users to the DB
        for (let i = 0; i < 15; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const encodedCursor = encodeCursor({ type: "OFFSET" });

        // Requesting the first page
        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedCursor })
          .expect(200);

        const firstCursor = decodeCursor(res.body.data.cursor);

        expect(res.body.data.cursor).toBeDefined();
        expect(firstCursor.type).toBe("OFFSET");
        expect(firstCursor.page).toBe(2);
        expect(res.body.data.searchResults.length).toBe(10);

        // Requesting the second page
        const resP2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: res.body.data.cursor })
          .expect(200);

        // Hopefully only get 5 back as that is all there is
        expect(resP2.body.data.searchResults.length).toEqual(5);
        // Null for the next cursor so we know there are no more pages
        expect(resP2.body.data.cursor).toBe(null);

        // Page beyond the dataset
        const page3 = encodeCursor({ page: 3 });

        // Requesting using our page 3 cursor
        const resP3 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: page3 })
          .expect(200);

        // Hopefully getting no search results and no new cursor
        expect(resP3.body.data.searchResults.length).toBe(0);
        expect(resP3.body.data.cursor).toBe(null);

        // Page beyond the dataset
        const page57 = encodeCursor({ page: 57 });

        // Requesting using our page 3 cursor
        const resP57 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: page57 })
          .expect(200);

        // Hopefully getting no search results and no new cursor
        expect(resP57.body.data.searchResults.length).toBe(0);
        expect(resP57.body.data.cursor).toBe(null);
      });
      it("Limit minimum restriction", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 10 users to the DB
        for (let i = 0; i < 10; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const encodedNegativeLimit = encodeCursor({ limit: -30 });
        const encodedZeroLimit = encodeCursor({ limit: 0 });
        const encodedStringLimit = encodeCursor({ limit: "words" });

        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedNegativeLimit })
          .expect(200);

        const res1Cursor = decodeCursor(res.body.data.cursor);

        expect(res.body.data.searchResults.length).toBe(10);
        expect(res1Cursor.type).toBe("CURSOR");
        expect(res1Cursor.limit).toBe(10);

        const res2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedZeroLimit })
          .expect(200);

        const res2Cursor = decodeCursor(res2.body.data.cursor);

        expect(res2.body.data.searchResults.length).toBe(10);
        expect(res2Cursor.type).toBe("CURSOR");
        expect(res2Cursor.limit).toBe(10);

        const res3 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedStringLimit })
          .expect(200);

        const res3Cursor = decodeCursor(res3.body.data.cursor);

        expect(res3.body.data.searchResults.length).toBe(10);
        expect(res3Cursor.type).toBe("CURSOR");
        expect(res3Cursor.limit).toBe(10);
      });
      it("Handles malformed type", async () => {
        const { token } = await succSignIn(newUser);
        const usernameList = [];
        // Adding 20 users to the DB
        for (let i = 0; i < 10; i++) {
          usernameList.push(`John${i}`);
        }
        await dbUsernameSearch(usernameList);

        const encodedMalformedType = encodeCursor({ type: "BEEPBOOP" });
        const encodedMalformedTypePage = encodeCursor({
          type: "OFFSIDE",
          page: 1,
        });

        // Requesting with a malformed type
        const res = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedMalformedType })
          .expect(200);

        const res1Cursor = decodeCursor(res.body.data.cursor);

        expect(res.body.data.searchResults.length).toBe(10);
        expect(res1Cursor.type).toBe("CURSOR");

        // Requesting with a malformed type and a page
        const res2 = await request(app)
          .get("/user-search")
          .set("Authorization", `Bearer ${token}`)
          .query({ search: "John" })
          .query({ cursor: encodedMalformedTypePage })
          .expect(200);

        const res2Cursor = decodeCursor(res2.body.data.cursor);

        expect(res2.body.data.searchResults.length).toBe(10);
        expect(res2Cursor.type).toBe("OFFSET");
      });
    });
  });
  describe("POST /friend-request/:userId", () => {
    it("Rejects if not authenticated with 401", async () => {
      const res = await request(app).post("/friend-request/123").expect(401);
    });
    it("Rejects if sender is receiver with 400", async () => {
      const { token, user } = await succSignIn(newUser);
      const res = await request(app)
        .post(`/friend-request/${user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
    });
    it("Rejects if userId does not exist with 404", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .post("/friend-request/123")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
    it("Creates a friend request if userId exists and is not already a friend with 201", async () => {
      // Add our user to the DB
      const { token, user } = await succSignIn(newUser);
      // Add another user to the DB who's ID we know
      const knownID = ["1234"];
      const idInDB = await dbKnownIDs(knownID);

      // Request to add them as a friend
      const res = await request(app)
        .post(`/friend-request/${knownID[0]}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
      // Expect 201 and a DB update to add a Friendship Status with the right data
      const friendshipStatus = await prisma.friendship.findMany({});
      expect(friendshipStatus.length).toBe(1);
      expect(friendshipStatus[0].senderId).toBe(user.id);
      expect(friendshipStatus[0].receiverId).toBe(knownID[0]);
      expect(friendshipStatus[0].status).toBe("PENDING");
    });
    it("Rejects if friend request already exists (pending or they accepted) with 400", async () => {
      const { token, user } = await succSignIn(newUser);
      // Add another user to the DB who's ID we know
      const knownID = ["1234", "98765", "666", "918273"];
      const idInDB = await dbKnownIDs(knownID);
      // Add pending friend request
      const pendingRequest = await prisma.friendship.create({
        data: {
          senderId: user.id,
          receiverId: knownID[0],
        },
      });
      // Try sending friend request to them - expect 400 and no change to db
      const res = await request(app)
        .post(`/friend-request/${knownID[0]}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      // Requesting friendship status from the db to check it hasnt changed
      const latestRequest = await prisma.friendship.findMany({
        where: {
          senderId: user.id,
          receiverId: knownID[0],
        },
      });
      expect(latestRequest[0].status).toBe("PENDING");
      expect(latestRequest[0].senderId).toBe(user.id);
      expect(latestRequest[0].receiverId).toBe(knownID[0]);

      // Add accepted friend to db
      const acceptedFriend = await prisma.friendship.create({
        data: {
          senderId: user.id,
          receiverId: knownID[1],
          status: "ACCEPTED",
        },
      });
      // Try sending friend request to them - expect 400 and no change to db
      const resAccept = await request(app)
        .post(`/friend-request/${knownID[1]}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      // Requesting friendship status from the db to check it hasnt changed
      const latestRequestAccept = await prisma.friendship.findMany({
        where: {
          senderId: user.id,
          receiverId: knownID[1],
        },
      });
      expect(latestRequestAccept[0].status).toBe("ACCEPTED");
      expect(latestRequestAccept[0].senderId).toBe(user.id);
      expect(latestRequestAccept[0].receiverId).toBe(knownID[1]);

      // Do the same but for the reverse-requests
      // Add pending friend request
      const pendingReverseRequest = await prisma.friendship.create({
        data: {
          senderId: knownID[2],
          receiverId: user.id,
        },
      });
      // Try sending friend request to them - expect 400 and no change to db
      const resReverseRequest = await request(app)
        .post(`/friend-request/${knownID[2]}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      // Requesting friendship status from the db to check it hasnt changed
      const latestReverseRequest = await prisma.friendship.findMany({
        where: {
          senderId: knownID[2],
          receiverId: user.id,
        },
      });
      expect(latestReverseRequest[0].status).toBe("PENDING");
      expect(latestReverseRequest[0].senderId).toBe(knownID[2]);
      expect(latestReverseRequest[0].receiverId).toBe(user.id);

      // Add accepted friend to db
      const acceptedReverseFriend = await prisma.friendship.create({
        data: {
          senderId: knownID[3],
          receiverId: user.id,
          status: "ACCEPTED",
        },
      });
      // Try sending friend request to them - expect 400 and no change to db
      const resReverseAccept = await request(app)
        .post(`/friend-request/${knownID[3]}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      // Requesting friendship status from the db to check it hasnt changed
      const latestReverseRequestAccept = await prisma.friendship.findMany({
        where: {
          senderId: knownID[3],
          receiverId: user.id,
        },
      });
      expect(latestReverseRequestAccept[0].status).toBe("ACCEPTED");
      expect(latestReverseRequestAccept[0].senderId).toBe(knownID[3]);
      expect(latestReverseRequestAccept[0].receiverId).toBe(user.id);
    });
  });
  describe("GET /friend-request/received", () => {
    it("Rejects if not authenticated with 401", async () => {
      const res = await request(app)
        .get("/friend-request/received")
        .expect(401);
    });
    it("Returns an empty array when there are no friend requests with 200", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .get("/friend-request/received")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.friendship.requests.length).toBe(0);
    });
    it("Returns list of users who have sent you requests with 200", async () => {
      const { token, user } = await succSignIn(newUser);
      const listOfIDs = ["123", "765", "636363", "909090", "1234987"];
      const idInDB = await dbKnownIDs(listOfIDs);
      for (let i = 0; i < listOfIDs.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: listOfIDs[i],
            receiverId: user.id,
          },
        });
      }
      const res = await request(app)
        .get("/friend-request/received")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const requestSenderIDs = res.body.data.friendship.requests.map(
        (request) => request.senderId,
      );
      expect(requestSenderIDs.sort()).toEqual(listOfIDs.sort());
      res.body.data.friendship.requests.forEach((e) =>
        expect(e.createdAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      );
    });
    it("Only returns pending requests and ignores accepted or rejected", async () => {
      const { token, user } = await succSignIn(newUser);
      // Users who will send us a pending request
      const pendingUsers = ["1", "2", "3", "4", "5"];
      // Users who we have accepted
      const addedUsers = ["6", "7", "8", "9", "10"];
      // Users who we sent a request to
      const sentPendingUsers = ["11", "12", "13", "14", "15"];
      // Users we added and they accepted
      const sentAddedUsers = ["16", "17", "18", "19", "20"];
      // Users who we rejected
      const rejectedUsers = ["21", "22", "23", "24", "25"];
      // Users who rejected us
      const sentRejectedUsers = ["26", "27", "28", "29", "30"];

      // Add them to the DB
      const pendingInDB = await dbKnownIDs([
        ...pendingUsers,
        ...addedUsers,
        ...sentPendingUsers,
        ...sentAddedUsers,
        ...rejectedUsers,
        ...sentRejectedUsers,
      ]);
      // Add friendships as outlined above
      for (let i = 0; i < pendingUsers.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: pendingUsers[i],
            receiverId: user.id,
          },
        });
      }
      for (let i = 0; i < sentPendingUsers.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: sentPendingUsers[i],
          },
        });
      }
      for (let i = 0; i < addedUsers.length; i++) {
        const addedSent = await prisma.friendship.create({
          data: {
            senderId: addedUsers[i],
            receiverId: user.id,
            status: "ACCEPTED",
          },
        });
      }
      for (let i = 0; i < sentAddedUsers.length; i++) {
        const addedSent = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: sentAddedUsers[i],
            status: "ACCEPTED",
          },
        });
      }
      for (let i = 0; i < rejectedUsers.length; i++) {
        const rejected = await prisma.friendship.create({
          data: {
            senderId: rejectedUsers[i],
            receiverId: user.id,
            status: "REJECTED",
          },
        });
      }
      for (let i = 0; i < sentRejectedUsers.length; i++) {
        const rejected = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: rejectedUsers[i],
            status: "REJECTED",
          },
        });
      }

      const res = await request(app)
        .get("/friend-request/received")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Get the IDs of the requests we have
      const requestIDs = res.body.data.friendship.requests.map(
        (request) => request.senderId,
      );

      // Our list of requests should match the first array
      expect(requestIDs.sort()).toEqual(pendingUsers.sort());
    });
    it("Includes the senders user details (id, username, names) along with the request info", async () => {
      const { token, user } = await succSignIn(newUser);
      const listOfIDs = ["1", "2", "3", "4", "5"];
      const idInDB = await dbKnownIDs(listOfIDs);
      for (let i = 0; i < listOfIDs.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: listOfIDs[i],
            receiverId: user.id,
          },
        });
      }
      const res = await request(app)
        .get("/friend-request/received")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      for (let i = 0; i < listOfIDs.length; i++) {
        const sender = res.body.data.friendship.requests[i].sender;
        expect(sender).toBeDefined();
        expect(sender).toHaveProperty("username");
        expect(sender).toHaveProperty("first_name");
        expect(sender).toHaveProperty("last_name");
      }
    });
  });
  describe("GET /friend-requests/sent", () => {
    it("Rejects if not authenticated with 401", async () => {
      const res = await request(app).get("/friend-request/sent").expect(401);
    });
    it("Returns an empty array when there are no friend requests with 200", async () => {
      const { token } = await succSignIn(newUser);
      const res = await request(app)
        .get("/friend-request/sent")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.friendship.requests.length).toBe(0);
    });
    it("Returns list of users who you have sent requests to with 200", async () => {
      const { token, user } = await succSignIn(newUser);
      const listOfIDs = ["123", "765", "636363", "909090", "1234987"];
      const idInDB = await dbKnownIDs(listOfIDs);
      for (let i = 0; i < listOfIDs.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: listOfIDs[i],
          },
        });
      }
      const res = await request(app)
        .get("/friend-request/sent")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const requestReceiverIDs = res.body.data.friendship.requests.map(
        (request) => request.receiverId,
      );
      expect(requestReceiverIDs.sort()).toEqual(listOfIDs.sort());
      res.body.data.friendship.requests.forEach((e) =>
        expect(e.createdAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      );
    });
    it.only("Only returns pending requests and ignores accepted or rejected", async () => {
      const { token, user } = await succSignIn(newUser);
      // Users who will send us a pending request
      const pendingUsers = ["1", "2", "3", "4", "5"];
      // Users who we have accepted
      const addedUsers = ["6", "7", "8", "9", "10"];
      // Users who we sent a request to
      const sentPendingUsers = ["11", "12", "13", "14", "15"];
      // Users we added and they accepted
      const sentAddedUsers = ["16", "17", "18", "19", "20"];
      // Users who we rejected
      const rejectedUsers = ["21", "22", "23", "24", "25"];
      // Users who rejected us
      const sentRejectedUsers = ["26", "27", "28", "29", "30"];

      // Add them to the DB
      const pendingInDB = await dbKnownIDs([
        ...pendingUsers,
        ...addedUsers,
        ...sentPendingUsers,
        ...sentAddedUsers,
        ...rejectedUsers,
        ...sentRejectedUsers,
      ]);
      // Add friendships as outlined above
      for (let i = 0; i < pendingUsers.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: pendingUsers[i],
            receiverId: user.id,
          },
        });
      }
      for (let i = 0; i < sentPendingUsers.length; i++) {
        const requestSent = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: sentPendingUsers[i],
          },
        });
      }
      for (let i = 0; i < addedUsers.length; i++) {
        const addedSent = await prisma.friendship.create({
          data: {
            senderId: addedUsers[i],
            receiverId: user.id,
            status: "ACCEPTED",
          },
        });
      }
      for (let i = 0; i < sentAddedUsers.length; i++) {
        const addedSent = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: sentAddedUsers[i],
            status: "ACCEPTED",
          },
        });
      }
      for (let i = 0; i < rejectedUsers.length; i++) {
        const rejected = await prisma.friendship.create({
          data: {
            senderId: rejectedUsers[i],
            receiverId: user.id,
            status: "REJECTED",
          },
        });
      }
      for (let i = 0; i < sentRejectedUsers.length; i++) {
        const rejected = await prisma.friendship.create({
          data: {
            senderId: user.id,
            receiverId: rejectedUsers[i],
            status: "REJECTED",
          },
        });
      }

      const res = await request(app)
        .get("/friend-request/sent")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Get the IDs of the requests we have
      const requestIDs = res.body.data.friendship.requests.map(
        (request) => request.receiverId,
      );

      // Our list of requests should match the first array
      expect(requestIDs.sort()).toEqual(sentPendingUsers.sort());
    });
    // it(
    //   "Includes the user details (id, username, names) along with the request info",
    // );
  });
});
