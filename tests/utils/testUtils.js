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

// To add a number of users and some mock messages between them into the DB
export async function fullDBSetup(users, messages) {
  // Stores the IDs of all the users we create so we can spoof the messages
  const userIDsStore = [];
  // This is a user who will have messages but we know the password of so we can log in during tests
  const ourUser = await prisma.user.create({
    where: {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: "FakePassword123!",
    },
  });
  // Push the ID to the array for sending messages
  userIDsStore.push(ourUser.id);
  // Looping to create different users in the DB. Allows us to easily scale up the number of users to test
  for (let i = 0; i < users; i++) {
    const newUser = await prisma.user.create({
      where: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      },
    });
    // Push to the arry for sending messages
    userIDsStore.push(newUser.id);
  }
  // Send the number of messages we input
  for (let i = 0; i < messages; i++) {
    // Randomise who the sender and receiver are from within the array of IDs
    const randomSenderIndex = Math.floor(Math.random() * userIDsStore.length);
    let randomReceiverIndex = Math.floor(Math.random() * userIDsStore.length);
    // If they are the same then find a different one
    while (randomSenderIndex === randomReceiverIndex) {
      let randomReceiverIndex = Math.floor(Math.random() * userIDsStore.length);
    }
    // Create the message from the sender
    const newMessage = await prisma.message.create({
      data: {
        content: faker.lorem.lines(),
        senderId: userIDsStore[randomSenderIndex],
      },
    });
    // Adds the recipient to the same message
    const recipient = await prisma.messageRecipient.create({
      data: {
        messageId: newMessage.id,
        userId: userIDsStore[randomReceiverIndex],
      },
    });
  }
}
