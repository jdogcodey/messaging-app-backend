import request from "supertest";
import app from "../../app.js";

export function newUser(overrides = {}) {
  return (user = {
    first_name: "testFirst",
    last_name: "testSecond",
    username: "testUsername",
    email: "testEmail@test.com",
    password: "testPassword1!",
    confirmPassword: "testPassword1!",
    ...overrides,
  });
}

export async function succSignIn(newUser) {
  const user = newUser();
  const res = await request(app).post("/signup").send(user);

  return {
    newUser,
    token: res.body.data.token,
    user: res.body.data.user,
  };
}
