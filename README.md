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

Authentication

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

Authorisation:

- JWT Auth:
  - returns 401 if not logged in
  - continues to next middleware if logged in
  - return 401 if JWT is expired or invalid
- Message Ownership:
  - If neither side of the convo is yours then returns 401

Messages

- POST message:
  - Creates message if sender and receiver are valid with 201
  - Stores correct timestamp
  - Rejects if sender isn't authenticated with 401
  - Rejects if receiver doesn't exist with 404
  - Rejects if sender is same as receiver with 400
  - Rejects if message body missing/empty with 400
- GET /my-messages:
  - Returns list of users you've messaged with the latest message for each with 200
  - List is ordered by latest message
  - Rejects if unauthenticated with 401
- GET /convo/:userId
  - Returns the 10 most recent messages with a given user with 200
  - Orders them by timestamp
  - Rejects if unauthenticated with 401
  - Rejects with 404 if userId is not valid
  - Rejects if requesting convo you aren't in - 403

Friends

- GET /user-search
  - Returns matching named users with 200
  - Excludes your own account from results with 200
  - Returns empty array if no matches with 200
  - Rejects if unauthenticated with 401
- POST /friend-request/:userId
  - Creates a friend request is userId exists and is not already a friend with 201
  - Rejects if not authenticated with 401
  - Rejects if userId does not exist with 404
  - Rejects if sender is receiver with 400
  - Rejects if friend request already exists (pending or they accepted) with 400
- GET /friend-requests/received
  - Returns list of users who have sent you requests with 200
  - Includes timestamp of when request was sent
  - Rejects if not authenticated with 401
- GET /friend-requests/sent
  - Returns list of users you have sent requests to with 200
  - Rejects if not authenticated with 401
- POST /friend-request/:requestId/accept
  - Accepts request and adds both users to each other's friend list with 200
  - Rejects if not authenticated with 401
  - Rejects if request doesn't exist or not addressed to you with 403
  - Rejects if request already accepted/rejected with 400
- POST /friend-request/:requestId/reject
  - Rejects request with 200
  - Rejects if not authenticated with 401
  - Rejects if request doesn't exist with 403
  - Rejects if request already accepted/rejected with 400
- GET /friends
  - Returns list of accepted friends with 200
  - List includes basic user info but no sensitive fields
  - Rejects if not authenticated with 401
