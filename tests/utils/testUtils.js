import request from "supertest";
import app from "../../app.js";
import prisma from "../../config/prisma-client.js";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import "dotenv";

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
export async function fullDBSetup(users, messages, fakeUname, fakePword) {
  // Stores the IDs of all the users we create so we can spoof the messages
  const userIDsStore = [];
  const myHashed = await bcrypt.hash(fakePword, 10);
  // This is a user who will have messages but we know the password of so we can log in during tests
  const ourUser = await prisma.user.create({
    data: {
      first_name: "First",
      last_name: "Last",
      username: fakeUname,
      email: "realemail@test.com",
      password: myHashed,
    },
  });
  // Push the ID to the array for sending messages
  userIDsStore.push(ourUser.id);
  // Looping to create different users in the DB. Allows us to easily scale up the number of users to test
  for (let i = 0; i < users; i++) {
    const hashedPassword = await bcrypt.hash(faker.internet.password(), 10);
    const newUser = await prisma.user.create({
      data: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: hashedPassword,
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
      randomReceiverIndex = Math.floor(Math.random() * userIDsStore.length);
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

// To add a number of users and some mock messages between them into the DB - but this time we know what the most recent messages are so we can test
export async function dbKnowMessages(users, fakeUname, fakePword) {
  // Stores the IDs of all the users we create so we can spoof the messages
  const userIDsStore = [];
  const myHashed = await bcrypt.hash(fakePword, 10);
  // This is a user who will have messages but we know the password of so we can log in during tests
  const ourUser = await prisma.user.create({
    data: {
      first_name: "First",
      last_name: "Last",
      username: fakeUname,
      email: "realemail@test.com",
      password: myHashed,
    },
  });
  // Looping to create different users in the DB. Allows us to easily scale up the number of users to test.
  // This time we are giving them a username we know so that we can test the messages later
  for (let i = 0; i < users; i++) {
    const hashedPassword = await bcrypt.hash(faker.internet.password(), 10);
    const newUser = await prisma.user.create({
      data: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        username: `testUser${i}`,
        email: faker.internet.email(),
        password: hashedPassword,
      },
    });
    // Push to the arry for sending messages
    userIDsStore.push(newUser.id);
  }
  // Send a message from each user we just created.
  for (let i = 0; i < users; i++) {
    // We don't need to randomise the sender and receiver here - we want to know what messages have been sent
    // Add the message to the DB
    const newMessage = await prisma.message.create({
      data: {
        content: `testMessage${i}`,
        senderId: userIDsStore[i],
      },
    });
    // Add our test user as the recipient for all messages - I'll test sent and received messages mixed together later
    const recipient = await prisma.messageRecipient.create({
      data: {
        messageId: newMessage.id,
        userId: ourUser.id,
      },
    });
  }
}

// To add a number of users and some mock messages between them into the DB - but this time we send and receive messages
// Got rid of the users input on this one - I will make 20 users as we are going to be specific about the messages - as we only want 10 convos this should be enough but I can always edit later
export async function dbKnowSendReceive(fakeUname, fakePword) {
  // Stores the IDs of all the users we create so we can spoof the messages
  const userIDsStore = [];
  const myHashed = await bcrypt.hash(fakePword, 10);
  // This is a user who will have messages but we know the password of so we can log in during tests
  const ourUser = await prisma.user.create({
    data: {
      first_name: "First",
      last_name: "Last",
      username: fakeUname,
      email: "realemail@test.com",
      password: myHashed,
    },
  });
  // Looping to create different users in the DB. Allows us to easily scale up the number of users to test.
  // This time we are giving them a username we know so that we can test the messages later
  for (let i = 0; i < 20; i++) {
    const hashedPassword = await bcrypt.hash(faker.internet.password(), 10);
    const newUser = await prisma.user.create({
      data: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        username: `testUser${i}`,
        email: faker.internet.email(),
        password: hashedPassword,
      },
    });
    // Push to the arry for sending messages
    userIDsStore.push(newUser.id);
  }
  // I'm going to keep this loop as then all chats have a message
  // Send a message from each user we just created.
  for (let i = 0; i < 20; i++) {
    // We don't need to randomise the sender and receiver here - we want to know what messages have been sent
    // Add the message to the DB
    const newMessage = await prisma.message.create({
      data: {
        content: `testMessage${i}`,
        senderId: userIDsStore[i],
      },
    });
    // Add our test user as the recipient for all messages - I'll test sent and received messages mixed together later
    const recipient = await prisma.messageRecipient.create({
      data: {
        messageId: newMessage.id,
        userId: ourUser.id,
      },
    });
  }
  // I will add messages to 3 chats to see if they jump to the top of my search
  // Then I'll send a couple of messages back and forth in one chat to ensure that chat appears at the top but doesn't mistakenly appear more than once
  for (let i = 1; i < 4; i++) {
    const newMessage = await prisma.message.create({
      data: {
        content: `testNewerMessage${i}`,
        senderId: ourUser.id, // This time we are sending messages
      },
    });
    // Add a different user as the recipient
    const recipient = await prisma.messageRecipient.create({
      data: {
        messageId: newMessage.id,
        userId: userIDsStore[i * 3], // Done this to ensure it isn't just the 3 most recent chats anyway. Ideally this would be configurable on input to the util - maybe i'll add later]
      },
    });
  }
}

// To add some messages between two users in the DB that we can test later
export async function dbMessageHistory(users, fakeUname, fakePword) {
  const myHashed = await bcrypt.hash(fakePword, 10);
  // This is the user who will have messages but we know the password of so we can log in during tests
  const ourUser = await prisma.user.create({
    data: {
      first_name: "First",
      last_name: "Last",
      username: fakeUname,
      email: "realemail@test.com",
      password: myHashed,
    },
  });
  // This time we only need one other user so no need to loop
  const hashedPassword = await bcrypt.hash(faker.internet.password(), 10);
  const otherUser = await prisma.user.create({
    data: {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      username: "testUser1",
      email: faker.internet.email(),
      password: hashedPassword,
    },
  });
  // Send 100 messages - we want to test the 10 most recent
  for (let i = 0; i < 100; i++) {
    const newMessage = await prisma.message.create({
      data: {
        content: `testMessage${i}`,
        senderId: userIDsStore[i],
      },
    });
    // Add our test user as the recipient for all messages - I'll tes sent and received messages mixed together later
    const recipient = await prisma.messageRecipient.create({
      data: {
        messageId: newMessage.id,
        userId: ourUser.id,
      },
    });
  }
}
