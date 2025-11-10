import request from "supertest";
import app from "../../app.js";
import prisma from "../../config/prisma-client.js";
import { faker } from "@faker-js/faker";

export function newUser(overrides = {}) {
  const uniqueId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    first_name: "testFirst",
    last_name: "testSecond",
    username: `testUsername_${uniqueId}`,
    email: `testEmail_${uniqueId}@test.com`,
    password: "testPassword1!",
    confirmPassword: "testPassword1!",
    ...overrides,
  };
}

export async function succSignIn(newUser) {
  const testUser = newUser();
  const res = await request(app).post("/signup").send(testUser);

  return {
    testUser,
    token: res.body.data.token,
    user: res.body.data.user,
  };
}

export async function fullDBSetup() {
  const userIDsStore = [];
  for (let i = 0; i < 25; i++) {
    const newUser = await prisma.user.create({
      where: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        username: faker.string.alphanumeric({ length: { min: 8, max: 20 } }),
        email: faker.internet.email(),
        password: faker.string.alphanumeric({ min: 8, max: 20 }),
      },
    });
    userIDsStore.push(newUser.id);
  }
}
