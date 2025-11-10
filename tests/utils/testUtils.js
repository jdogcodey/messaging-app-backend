import request from "supertest";
import app from "../../app.js";
import prisma from "../../config/prisma-client.js";

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
