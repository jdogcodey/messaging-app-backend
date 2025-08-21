# messaging-app-backend

Following the Odin Project - Messaging App Project.

Needs to have the following core functionality:

1. Authorisation
2. Sending messages to other users
3. Customising a user profile

Plan:

- Keep the backend as simple as possible and only have the very basic necessities
- Passport.js will do the authentication for me and I'll use bcrypt for hashing and JWT for the authentication
- Database:
  - User (id, email, username, password, first name, last name)
  - Messages (id, sender, receiver, content, timestamp)
- Routes:
  - POST signup - send info to the DB, create user, return JWT
  - POST login - check password matches, return JWT
  - GET my-messages - Search database and get each person you have messaged and the latest message with them
  -
