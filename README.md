# messaging-app-backend

Following the Odin Project - Messaging App Project.

Needs to have the following core functionality:

- [x] 1. Authorisation
- [ ] 2. Sending messages to other users
- [ ] 3. Customising a user profile

Plan:

- Keep the backend as simple as possible and only have the very basic necessities
- Passport.js will do the authentication for me and I'll use bcrypt for hashing and JWT for the authentication
- Database:
  - User (id, email, username, password, first name, last name)
  - Messages (id, sender, receiver, content, timestamp)
- Routes:
  - [x] POST signup - send info to the DB, create user, return JWT
  - [x] POST login - check password matches, return JWT
  - [x] GET my-messages - Search database and get each person you have messaged and the latest message with them
  - [x] GET convo with sender and receiver ID - Search database for 10 most recent messages between yourself and someone else
  - [x] POST message - with sender and receiver ID
  - [ ] GET user-search - search for users by their name - to then add them

Testing:

On this project I want to start by writing some decent tests and then making functions to meet them.

### Authentication

- Signup:
  - [x] Returns 201
  - [x] Returns with a JWT
  - [x] Rejects with missing fields
  - [x] Rejects if email or username exist
- Login:
  - [x] Returns 200
  - [x] Returns correct logged in JWT
  - [x] JWT works
  - [x] Rejects 401 with wrong password
  - [x] Rejects 401 with unknown email

### Authorisation

- JWT Auth:
  - [x] returns 401 if not logged in
  - [x] continues to next middleware if logged in
  - [x] return 401 if JWT is expired or invalid

### Messages

- POST message:
  - [x] Creates message if sender and receiver are valid with 201
  - [x] Stores correct timestamp
  - [x] Rejects if sender isn't authenticated with 401
  - [x] Rejects if receiver doesn't exist with 404
  - [x] Rejects if sender is same as receiver with 400
  - [x] Rejects if message body missing/empty with 400
  - [x] Adds recipient correctly
- GET /my-messages:
  - [x] Returns list of users you've messaged or received from with the latest message for each with 200
  - [x] List is ordered by latest message
  - [x] Rejects if unauthenticated with 401
- GET /convo/:userId
  - [x] Returns the 10 most recent messages with a given user with 200
  - [x] Orders them by timestamp
  - [x] Rejects if unauthenticated with 401
  - [x] Rejects with 404 if userId is not valid

### Friends

- GET /user-search
  - [ ] Returns matching named users with 200
  - [x] Rejects with 400 if no search sent
  - [x] Excludes your own account from results with 200
  - [x] Returns empty array if no matches with 200
  - [x] Rejects if unauthenticated with 401
  - [x] Search first names - exact match
  - [x] Search first names - partial match
  - [x] Search last names - exact match
  - [x] Search last names - partial match
  - [x] Search usernames
  - [x] Search targets first, last and username at once
  - [ ] Username search ignores spaces
  - [ ] Search first and last combined ('John Smith' doesn't show all 'John' and 'Smith' but rather 'John Smith')
  - [ ] Search with spaces separates after first space and searches first and last OR username ('jo h n' searches first:'jo' last: 'hn' and username:'john')
  - [ ] Search orders in a sensible order
- POST /friend-request/:userId
  - [ ] Creates a friend request is userId exists and is not already a friend with 201
  - [ ] Rejects if not authenticated with 401
  - [ ] Rejects if userId does not exist with 404
  - [ ] Rejects if sender is receiver with 400
  - [ ] Rejects if friend request already exists (pending or they accepted) with 400
- GET /friend-requests/received
  - [ ] Returns list of users who have sent you requests with 200
  - [ ] Includes timestamp of when request was sent
  - [ ] Rejects if not authenticated with 401
- GET /friend-requests/sent
  - [ ] Returns list of users you have sent requests to with 200
  - [ ] Rejects if not authenticated with 401
- POST /friend-request/:requestId/accept
  - [ ] Accepts request and adds both users to each other's friend list with 200
  - [ ] Rejects if not authenticated with 401
  - [ ] Rejects if request doesn't exist or not addressed to you with 403
  - [ ] Rejects if request already accepted/rejected with 400
- POST /friend-request/:requestId/reject
  - [ ] Rejects request with 200
  - [ ] Rejects if not authenticated with 401
  - [ ] Rejects if request doesn't exist with 403
  - [ ] Rejects if request already accepted/rejected with 400
- GET /friends
  - [ ] Returns list of accepted friends with 200
  - [ ] List includes basic user info but no sensitive fields
  - [ ] Rejects if not authenticated with 401
