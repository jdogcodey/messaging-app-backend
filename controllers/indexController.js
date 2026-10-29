import { validationResult, matchedData } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv";
import passport from "passport";
import "../config/passport.js";
import validationErrorController from "./validationErrorsController.js";
import { decodeCursor, encodeCursor } from "./cursorController.js";
import { db } from "../src/prisma/db.ts";
import { and, not, or } from "@prisma/orm-postgres/orm-client";

const indexController = {
  signup: async (req, res, next) => {
    // Takes the sign up POST request, validates the form, checks if the user already exists, then creates the user returning 201 on success

    // Destructuring the form
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      confirmPassword,
    } = req.body;

    // Checking that a user with that email or username exists
    try {
      const checkForDuplicate = await db.orm.public.User.where((u) =>
        or(u.email.eq(email), u.username.eq(username)),
      ).first();

      // Return with 400 to user (could be 409 but this could expose that an email is signed up)
      if (checkForDuplicate) {
        let duplicateField =
          checkForDuplicate.email === req.body.email ? "email" : "username";
        return res.status(400).json({
          success: false,
          message: "Already have an account? Go to login",
        });
      }
      // Hashing the password for storage
      const hashedPassword = await bcrypt.hash(password, 10);

      // Adding the user to the database
      const newUser = await db.orm.public.User.create({
        first_name: first_name,
        last_name: last_name,
        username: username,
        email: email,
        password: hashedPassword,
      });

      // Destructuring the password from the user
      const { password: _password, ...userWithoutPassword } = newUser;

      // Signing a token for the user
      const token = jwt.sign({ userId: newUser.id }, process.env.SECRET, {
        expiresIn: "1h",
      });

      // Returning the token to the user
      res.status(201).json({
        success: true,
        message: "Sign up successful",
        data: {
          token: token,
          user: userWithoutPassword,
        },
      });
    } catch (err) {
      // Error Handler
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server says no",
        errors: err,
      });
    }
  },
  login: async (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      // Handles an error or no user
      if (err || !user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
          errors: err || errors,
        });
      }

      // Creates the payload of the userId
      const payload = { userId: user.id };

      // Uses this payload to sign a new token
      const token = jwt.sign(payload, process.env.SECRET, {
        expiresIn: "1h",
      });

      // Returns that the user has logged in - and provides them with the token we just created
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        },
      });
    })(req, res, next);
  },
  getUser: (req, res, next) => {
    res.status(200).json({
      success: true,
      message: "Authorised",
    });
  },
  postMessage: async (req, res, next) => {
    if (req.params.receiverId === req.user.id) {
      res.status(400).json({
        success: false,
        message: "Do you have no friends?",
      });
    } else {
      try {
        const messageInDB = await db.orm.public.Message.create({
          content: req.body.message,
          senderId: req.user.id,
        });
        await db.orm.public.MessageRecipient.create({
          userId: req.params.receiverId,
          messageId: messageInDB.id,
        });
        res.status(201).json({
          success: true,
          message: "Message sent",
        });
      } catch {
        res.status(500).json({
          success: false,
          message: "Computer says no",
        });
      }
    }
  },
  getMyMessages: async (req, res, next) => {
    const userId = req.user.id;
    const plan = db.raw.sql`
  WITH all_pairs AS (
    SELECT
      m.id AS "messageId",
      m.content,
      m."createdAt",
      m."senderId",
      mr."userId" AS "recipientId",
      CASE 
        WHEN m."senderId" = ${userId} THEN mr."userId"
        ELSE m."senderId"
      END AS "otherUserId"
    FROM "Message" m
    JOIN "MessageRecipient" mr ON mr."messageId" = m.id
    WHERE m."senderId" = ${userId} OR mr."userId" = ${userId}
  ),
  ranked AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY "otherUserId"
        ORDER BY "createdAt" DESC 
      ) AS rn
    FROM all_pairs
  )
  SELECT 
    "messageId",
    content,
    "createdAt",
    "senderId",
    "recipientId",
    "otherUserId"
  FROM ranked 
  WHERE rn = 1
  ORDER BY "createdAt" DESC
  LIMIT 10;
`
      .returnsRow({
        messageId: db.sql.public.Message.columns.id,
        content: db.sql.public.Message.columns.content,
        createdAt: db.sql.public.Message.columns.createdAt,
        senderId: db.sql.public.Message.columns.senderId,
        recipientId: db.sql.public.User.columns.id,
        otherUserId: db.sql.public.User.columns.id,
      })
      .build();

    const messageList = await db.query(plan);
    res.status(200).json({
      success: true,
      message: "Message request successful",
      data: {
        conversations: messageList,
        user: {
          id: req.user.id,
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          username: req.user.username,
          email: req.user.email,
        },
      },
    });
  },
  getConvo: async (req, res, next) => {
    const ourUser = req.user.id;
    const otherUser = req.params.userId;
    const messages = await db.orm.public.Message.where((m) =>
      or(
        and(
          m.senderId.eq(ourUser),
          m.recipients.some((r) => r.userId.eq(otherUser)),
        ),
        and(
          m.senderId.eq(otherUser),
          m.recipients.some((r) => r.userId.eq(ourUser)),
        ),
      ),
    )
      .orderBy((m) => m.createdAt.desc())
      .limit(10)
      .all();
    if (messages.length < 1) {
      res.status(404).json({
        success: false,
        message: "Conversation request unsuccessful",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Conversation request successful",
        data: {
          user: {
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            username: req.user.username,
            email: req.user.email,
          },
          messages: messages,
        },
      });
    }
  },
  userSearch: async (req, res, next) => {
    // Going to start fresh as this is going to operate quite differently as I'm sure there is some overlap.
    // Following https://peterevans.dev/posts/pagination-supporting-both-cursor-and-page-based-strategies/#:~:text=This%20means%20we%20can%20encode%20any%20pagination,but%20the%20server%20knows%20exactly%20what%20t
    const { search, cursor } = matchedData(req); // Collects the search and the cursor
    const fullSearch = search.trim().toLowerCase(); // Trims any surrounding spaces and get rid of any cases that may have been sent
    const searchTerms = fullSearch.split(/\s+/).filter(Boolean); // Split search terms (for use later) and filter to remove any double spaces etc.
    const singleTerm = fullSearch.replace(/\s+/g, ""); // Remove whitespace but keep one single search term to search username
    let nameSearch; // Used to alter search based on number of submitted terms
    const firstTermSearch = searchTerms[0];
    const lastTermSearch = searchTerms.slice(1).join(" ");
    let results = []; // Creating the output here as I will be running multiple queries to fill up 10 results
    const currentCursor = decodeCursor(cursor);
    let nextCursor = {};
    let cursorMode = "username";

    try {
      if (currentCursor.type !== "OFFSET" && currentCursor.type !== "PAGE") {
        // If they want to cursor paginate on username OR if they havent specified a mode and the length of their search is just one term
        if (
          currentCursor.mode === "username" ||
          (!currentCursor.mode && searchTerms.length < 2)
        ) {
          const excludedIds = [...results.map((user) => user.id), req.user.id];
          // 1. Build the base query
          let query = db.orm.public.User.where((u) =>
            and(u.id.notIn(excludedIds), u.username.ilike(`%${singleTerm}%`)),
          )
            .select("id", "first_name", "last_name", "username")
            .orderBy((u) => u.id.asc())
            .limit(currentCursor.limit);

          // 2. Conditionally apply cursor and skip if a cursor exists
          if (currentCursor.id) {
            query = query.cursor({ id: currentCursor.id });
          }

          // 3. Execute the query
          const cursorUsernameSearch = await query.all();
          results = [...cursorUsernameSearch];
          if (results.length < 10) {
            const excludedIds = [
              ...results.map((user) => user.id),
              req.user.id,
            ];

            // 1. Build the base query
            let query = db.orm.public.User.where((u) =>
              and(
                u.id.notIn(excludedIds),
                or(
                  u.last_name.ilike(`${singleTerm}%`),
                  u.first_name.ilike(`${singleTerm}%`),
                ),
              ),
            )
              .orderBy((u) => u.id.asc())
              .limit(currentCursor.limit - results.length);

            // 2. Conditionally apply the cursor if it exists
            if (currentCursor.id) {
              query = query.cursor({ id: currentCursor.id });
            }

            // 3. Execute the query
            const cursorSingleNameSearch = await query.all();
            results = results.concat(cursorSingleNameSearch);
            cursorMode = "full-name";
          }
          nextCursor = {
            type: "CURSOR",
            mode: cursorMode,
            limit: currentCursor.limit,
            ...(results.length > 0 && {
              id: results[results.length - 1].id,
            }),
          };
        } else if (
          currentCursor.mode === "full-name" ||
          (!currentCursor.mode && searchTerms.length > 1)
        ) {
          cursorMode = "full-name";
          const excludedIds = [...results.map((user) => user.id), req.user.id];

          // 1. Build the base query
          let query = db.orm.public.User.where((u) =>
            and(
              u.id.notIn(excludedIds),
              or(
                and(
                  u.first_name.ilike(`${firstTermSearch}%`),
                  u.last_name.ilike(`${lastTermSearch}%`),
                ),
                and(
                  u.first_name.ilike(`${lastTermSearch}%`),
                  u.last_name.ilike(`${firstTermSearch}%`),
                ),
              ),
            ),
          )
            .orderBy((u) => u.id.asc())
            .limit(currentCursor.limit);

          // 2. Conditionally apply the cursor if it exists
          if (currentCursor.id) {
            query = query.cursor({ id: currentCursor.id });
          }

          // 3. Execute the query
          const cursorFullNameSearch = await query.all();
          results = [...cursorFullNameSearch];
          if (results.length < 10) {
            cursorMode = "username";
            const excludedIds = [
              ...results.map((user) => user.id),
              req.user.id,
            ];

            // 1. Build the base query
            let query = db.orm.public.User.where((u) =>
              and(u.id.notIn(excludedIds), u.username.ilike(`%${singleTerm}%`)),
            )
              .orderBy((u) => u.id.asc())
              .limit(currentCursor.limit - results.length);

            // 2. Conditionally apply the cursor if it exists
            if (currentCursor.id) {
              query = query.cursor({ id: currentCursor.id });
            }

            // 3. Execute the query
            const cursorUsernameSearch = await query.all();
            results = results.concat(cursorUsernameSearch);
          }
          nextCursor = {
            type: "CURSOR",
            mode: cursorMode,
            limit: currentCursor.limit,
            ...(results.length > 0 && {
              id: results[results.length - 1].id,
            }),
          };
        }
      } else {
        if (
          currentCursor.mode === "username" ||
          (!currentCursor.mode && searchTerms.length < 2)
        ) {
          const excludedIds = [...results.map((user) => user.id), req.user.id];

          // 1. Build the base query using fluent methods
          let query = db.orm.public.User.where((u) =>
            and(u.id.notIn(excludedIds), u.username.ilike(`%${singleTerm}%`)),
          )
            .orderBy((u) => u.id.asc())
            .limit(currentCursor.limit);

          // 2. Apply offset pagination if page > 1
          if (currentCursor.page > 1) {
            query = query.offset(
              currentCursor.limit * (currentCursor.page - 1),
            );
          }

          // 3. Execute the query
          const pageUsernameSearch = await query.all();
          results = [...pageUsernameSearch];
          nextCursor =
            results.length < currentCursor.limit
              ? null
              : {
                  type: "OFFSET",
                  mode: cursorMode,
                  limit: currentCursor.limit,
                  ...(results.length > 0 && {
                    page: currentCursor.page + 1,
                  }),
                };
        } else if (
          currentCursor.mode === "full-name" ||
          (!currentCursor.mode && searchTerms.length > 1)
        ) {
          cursorMode = "full-name";
          const excludedIds = [...results.map((user) => user.id), req.user.id];

          // 1. Build the base query
          let query = db.orm.public.User.where((u) =>
            and(
              u.id.notIn(excludedIds),
              or(
                and(
                  u.first_name.ilike(`${firstTermSearch}%`),
                  u.last_name.ilike(`${lastTermSearch}%`),
                ),
                and(
                  u.first_name.ilike(`${lastTermSearch}%`),
                  u.last_name.ilike(`${firstTermSearch}%`),
                ),
              ),
            ),
          )
            .orderBy((u) => u.id.asc())
            .limit(currentCursor.limit);

          // 2. Apply offset pagination if page > 1
          if (currentCursor.page > 1) {
            query = query.offset(
              currentCursor.limit * (currentCursor.page - 1),
            );
          }

          // 3. Execute the query
          const pageFullNameSearch = await query.all();
          results = [...pageFullNameSearch];
          nextCursor =
            results.length < currentCursor.limit
              ? null
              : {
                  type: "CURSOR",
                  mode: cursorMode,
                  limit: currentCursor.limit,
                  ...(results.length > 0 && {
                    page: currentCursor.page + 1,
                  }),
                };
        }
      }

      let nextCursorEncoded;
      if (nextCursor) {
        nextCursorEncoded = encodeCursor(nextCursor);
      } else {
        nextCursorEncoded = null;
      }

      res.status(200).json({
        success: true,
        message: "User search results",
        data: {
          searchResults: results,
          cursor: nextCursorEncoded,
        },
      });
    } catch (err) {
      console.error("Search failed with error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
  postFriendRequest: async (req, res, next) => {
    const userId = req.user.id;
    const searchId = req.params.userId;
    if (userId === searchId) {
      res.status(400).json({
        success: false,
        message: "You want to be your own friend?",
      });
    } else {
      // Check if user exists in db
      const searchInDB = await db.orm.public.User.where({ id: searchId }).all();
      if (searchInDB.length < 1) {
        res.status(404).json({
          success: false,
          message: "Cant find user",
        });
      } else {
        // Check if friendship connection exists
        const friendshipCheck = await db.orm.public.Friendship.where((f) =>
          or(
            and(f.senderId.eq(userId), f.receiverId.eq(searchId)),
            and(f.senderId.eq(searchId), f.receiverId.eq(userId)),
          ),
        ).all();
        if (friendshipCheck.length < 1) {
          const friendshipUpdate = await db.orm.public.Friendship.create({
            senderId: userId,
            receiverId: searchId,
          });

          res.status(201).json({
            success: true,
            message: "Friendship request sent",
            data: {
              friendship: {
                update: {
                  request: {
                    senderId: friendshipUpdate.senderId,
                    receiverId: friendshipUpdate.receiverId,
                    status: friendshipUpdate.status,
                    createdAt: friendshipUpdate.createdAt,
                  },
                },
              },
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Friendship request already exists",
          });
        }
      }
    }
  },
  getFriendRequest: async (req, res, next) => {
    const friendshipRequests = await db.orm.public.Friendship.where((f) =>
      and(f.receiverId.eq(req.user.id), f.status.eq("PENDING")),
    )
      .include("sender")
      .all();
    res.status(200).json({
      success: true,
      message: "Received friendship requests",
      data: {
        friendship: {
          requests: friendshipRequests || [],
        },
      },
    });
  },
  getFriendRequestSent: async (req, res, next) => {
    const friendshipRequests = await db.orm.public.Friendship.where((f) =>
      and(f.senderId.eq(req.user.id), f.status.eq("PENDING")),
    )
      .include("receiver")
      .all();
    res.status(200).json({
      success: true,
      message: "Received friendship requests",
      data: {
        friendship: {
          requests: friendshipRequests || [],
        },
      },
    });
  },
  patchFriendRequest: async (req, res, next) => {
    try {
      const request = await db.orm.public.Friendship.where({
        id: req.params.requestId,
      }).first();

      const newStatus = req.body.status;

      if (request) {
        // If the request is actually sent to them
        if (request.receiverId === req.user.id) {
          // If the status is pending
          if (request.status === "PENDING") {
            // Update the status in the DB
            const updatedStatus = await db.orm.public.Friendship.where({
              id: req.params.requestId,
            }).update({ status: newStatus });
            // Send this to the user
            res.status(200).json({
              success: true,
              message: "Accepted Friendship Request",
              data: {
                friendship: {
                  requests: updatedStatus || [],
                },
              },
            });
          } else {
            if (request.status === "ACCEPTED") {
              res.status(400).json({
                success: false,
                message: "You are already friends",
              });
            } else if (request.status === "REJECTED") {
              res.status(400).json({
                success: false,
                message: "You already rejected this",
              });
            }
          }
        } else {
          if (request.senderId === req.user.id) {
            res.status(403).json({
              success: false,
              message: "You sent this friend request",
            });
          } else {
            // Could be 403 but going with 404 as doesnt leak that the resource exists if it doesnt belong to them
            res.status(404).json({
              success: false,
              message: "Couldnt find Friend Request",
            });
          }
        }
      } else {
        res.status(404).json({
          success: false,
          message: "Couldnt find Friend Request",
        });
      }
    } catch {
      res.status(500).json({
        success: false,
        message: "Computer says no",
      });
    }
  },
  getFriends: async (req, res, next) => {
    const ourFriends = await db.orm.public.Friendship.where((f) =>
      and(
        or(f.receiverId.eq(req.user.id), f.senderId.eq(req.user.id)),
        f.status.eq("ACCEPTED"),
      ),
    )
      .include("sender", (s) =>
        s.select("id", "username", "first_name", "last_name"),
      )
      .include("receiver", (r) =>
        r.select("id", "username", "first_name", "last_name"),
      )
      .all();

    res.status(200).json({
      success: true,
      data: {
        friends: ourFriends,
      },
    });
  },
  // TODO
  // Work through the transition to Prisma ORM 8 documentation
  // Get this route working
  // Transition to Prisma ORM 8 everywhere (good to experience doing this somewhere with something)
  // Then finally this project back end will be done!
  // patchUserProfile: async (req, res, next) => {
  //   // Updating all the properties they want to update
  //   for (const property in req.body) {
  //     const updatedUser = await db.orm.public.User.where({
  //       id: req.user.id,
  //     }).update({
  //       [property]: req.body[property],
  //     }); // I think this is new in Prisma 8? Need to read up on it a bit more but just building following the docs and is different from before
  //   }

  //   // Get the updated user from the DB
  //   // Again using Prisma 8 hopefully
  //   const updatedUser = await db.orm.public.User.first({
  //     id: req.user.id,
  //   }).select(
  //     "id",
  //     "first_name",
  //     "last_name",
  //     "username",
  //     "avatar",
  //     "theme",
  //     "statusMessage",
  //   );

  //   res.status(200).json({
  //     success: true,
  //     message: "Successfully updated user profile",
  //     data: {
  //       user: updatedUser,
  //     },
  //   });
  // },
};

export default indexController;
