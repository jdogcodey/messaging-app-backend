import request from "supertest";
import app from "../../app.js";

export function newUser(overrides = {}) {
  return {
    first_name: "testFirst",
    last_name: "testSecond",
    username: "testUsername",
    email: "testEmail@test.com",
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
