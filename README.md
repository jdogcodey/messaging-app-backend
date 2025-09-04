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
  - GET convo with sender and receiver ID - Search database for 10 most recent messages between yourself and someone else
  - POST message - with sender and receiver ID
  - GET user-search - search for users by their name - to then add them

Testing:

On this project I want to start by writing some decent tests and then making functions to meet them.

Auth

- Signup:
  - Returns 201
  - Returns with a JWT
  - Rejects with missing fields
  - Rejects if email or username exist
- Login:
  - Returns 200
  - Returns correct logged in JWT
  - JWT works
  - Rejects 401 with wrong password
  - Rejects 404 with unknown email

Messages

- POST message:
  - Creates message if sender and receiver are valid
  - Stores correct timestamp
  - Rejects if sender isn't authenticated
- GET /my-messages:
  - Returns list of users you've messaged with the latest message for each
  - List is ordered by latest message
  - Rejects if unauthenticated
- GET /convo/:userId
  - Returns the 10 most recent messages with a given user
  - Orders them by timestamp
  - Rejects if unauthenticated or incorrectly authenticated

User

- GET /user-search
  - Returns matching named users
  - Excludes your own account from results
  - Returns empty array if no matches
