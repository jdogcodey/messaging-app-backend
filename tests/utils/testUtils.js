import request from "supertest";
import app from "../../app.js";

export const newUser = {
  first_name: "testFirst",
  last_name: "testSecond",
  username: "testUsername",
  email: "testEmail@test.com",
  password: "testPassword1!",
  confirmPassword: "testPassword1!",
  ...overrides,
};

export async function succSignIn(newUser) {
  const res = await request(app).post("/signup").send(newUser);

  return {
    token: res.body.data.token,
    user: res.body.data.user,
  };
}
