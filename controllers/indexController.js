import { validationResult, matchedData } from "express-validator";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma-client.js";
import jwt from "jsonwebtoken";
import "dotenv";
import passport from "passport";
import "../config/passport.js";
import validationErrorController from "./validationErrorsController.js";
import { decodeCursor, encodeCursor } from "./cursorController.js";

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
      const checkForDuplicate = await prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: username }],
        },
      });

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
      const newUser = await prisma.user.create({
        data: {
          first_name: first_name,
          last_name: last_name,
          username: username,
          email: email,
          password: hashedPassword,
        },
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
        const messageInDB = await prisma.message.create({
          data: {
            content: req.body.message,
            senderId: req.user.id,
          },
        });
        await prisma.messageRecipient.create({
          data: {
            userId: req.params.receiverId,
            messageId: messageInDB.id,
          },
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
    const messageList = await prisma.$queryRaw`
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
`;
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
    const messages = await prisma.message.findMany({
      take: 10,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      where: {
        OR: [
          {
            senderId: ourUser,
            recipients: {
              some: {
                userId: otherUser,
              },
            },
          },
          {
            senderId: otherUser,
            recipients: {
              some: {
                userId: ourUser,
              },
            },
          },
        ],
      },
    });
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
          cursorUsernameSearch = await prisma.user.findMany({
            where: {
              id: {
                notIn: [...results.map((user) => user.id), req.user.id],
              },
              username: { contains: singleTerm, mode: "insensitive" },
            },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
            },
            take: currentCursor.limit,
            ...(currentCursor.id && {
              cursor: { id: currentCursor.id },
              skip: 1,
            }),
            orderBy: { id: "asc" },
          });
          results = [...cursorUsernameSearch];
          if (results.length < 10) {
            cursorSingleNameSearch = await prisma.user.findMany({
              where: {
                id: {
                  notIn: [...results.map((user) => user.id), req.user.id],
                },
                OR: [
                  {
                    last_name: { startsWith: singleTerm, mode: "insensitive" },
                  },
                  {
                    first_name: { startsWith: singleTerm, mode: "insensitive" },
                  },
                ],
              },
              select: {
                id: true,
                first_name: true,
                last_name: true,
                username: true,
              },
              take: currentCursor.limit - results.length,
              ...(currentCursor.id && {
                cursor: { id: currentCursor.id },
                skip: 1,
              }),
              orderBy: { id: "asc" },
            });
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
          cursorFullNameSearch = await prisma.user.findMany({
            where: {
              id: {
                notIn: [...results.map((user) => user.id), req.user.id],
              },
              OR: [
                {
                  AND: [
                    {
                      first_name: {
                        startsWith: firstTermSearch,
                        mode: "insensitive",
                      },
                    },
                    {
                      last_name: {
                        startsWith: lastTermSearch,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
                {
                  AND: [
                    {
                      first_name: {
                        startsWith: lastTermSearch,
                        mode: "insensitive",
                      },
                    },
                    {
                      last_name: {
                        startsWith: firstTermSearch,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              ],
            },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
            },
            take: currentCursor.limit,
            ...(currentCursor.id && {
              cursor: { id: currentCursor.id },
              skip: 1,
            }),
            orderBy: { id: "asc" },
          });
          results = [...cursorFullNameSearch];
          if (results.length < 10) {
            cursorMode = "username";
            cursorUsernameSearch = await prisma.user.findMany({
              where: {
                id: {
                  notIn: [...results.map((user) => user.id), req.user.id],
                },
                username: { contains: singleTerm, mode: "insensitive" },
              },
              select: {
                id: true,
                first_name: true,
                last_name: true,
                username: true,
              },
              take: currentCursor.limit - results.length,
              ...(currentCursor.id && {
                cursor: { id: currentCursor.id },
                skip: 1,
              }),
              orderBy: { id: "asc" },
            });
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
          pageUsernameSearch = await prisma.user.findMany({
            where: {
              id: {
                notIn: [...results.map((user) => user.id), req.user.id],
              },
              username: { contains: singleTerm, mode: "insensitive" },
            },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
            },
            take: currentCursor.limit,
            ...(currentCursor.page > 1 && {
              skip: currentCursor.limit * (currentCursor.page - 1),
            }),
            orderBy: { id: "asc" },
          });
          results = [...pageUsernameSearch];
          // if (results.length < 10) {
          //   pageSingleNameSearch = await prisma.user.findMany({
          //     where: {
          //       id: {
          //         notIn: [...results.map((user) => user.id), req.user.id],
          //       },
          //       OR: [
          //         {
          //           last_name: { startsWith: singleTerm, mode: "insensitive" },
          //         },
          //         {
          //           first_name: { startsWith: singleTerm, mode: "insensitive" },
          //         },
          //       ],
          //     },
          //     select: {
          //       id: true,
          //       first_name: true,
          //       last_name: true,
          //       username: true,
          //     },
          //     take: currentCursor.limit - results.length,
          //     ...(currentCursor.page > 1 && {
          //       skip: currentCursor.limit * (currentCursor.page - 1),
          //     }),
          //     orderBy: { id: "asc" },
          //   });
          //   results = results.concat(pageSingleNameSearch);
          //   cursorMode = "full-name";
          // }
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
          pageFullNameSearch = await prisma.user.findMany({
            where: {
              id: {
                notIn: [...results.map((user) => user.id), req.user.id],
              },
              OR: [
                {
                  AND: [
                    {
                      first_name: {
                        startsWith: firstTermSearch,
                        mode: "insensitive",
                      },
                    },
                    {
                      last_name: {
                        startsWith: lastTermSearch,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
                {
                  AND: [
                    {
                      first_name: {
                        startsWith: lastTermSearch,
                        mode: "insensitive",
                      },
                    },
                    {
                      last_name: {
                        startsWith: firstTermSearch,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              ],
            },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
            },
            take: currentCursor.limit,
            ...(currentCursor.id && {
              cursor: { id: currentCursor.id },
              skip: 1,
            }),
            orderBy: { id: "asc" },
          });
          results = [...pageFullNameSearch];
          // if (results.length < 10) {
          //   cursorMode = "username";
          //   pageUsernameSearch = await prisma.user.findMany({
          //     where: {
          //       id: {
          //         notIn: [...results.map((user) => user.id), req.user.id],
          //       },
          //       username: { contains: singleTerm, mode: "insensitive" },
          //     },
          //     select: {
          //       id: true,
          //       first_name: true,
          //       last_name: true,
          //       username: true,
          //     },
          //     take: currentCursor.limit,
          //     ...(currentCursor.id && {
          //       cursor: { id: currentCursor.id },
          //       skip: 1,
          //     }),
          //     orderBy: { id: "asc" },
          //   });
          //   results = results.concat(pageUsernameSearch);
          // }
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

    // try {
    //   if (
    //     currentCursor.phase === "PRIMARY" ||
    //     (currentCursor.phase !== "SECONDARY" && searchTerms.length > 1)
    //   ) {
    //     if (currentCursor.type === "OFFSET" || currentCursor.type === "PAGE") {
    //       // Basically if the user has searched where we think they could want a first and last name
    //       const firstTerm = searchTerms[0];
    //       //const firstTermSearch = `${firstTerm}:*`; // We add :* so that 'Jo' would find 'Joan' and 'Joanne' etc.
    //       const firstTermSearch = firstTerm;
    //       //const lastTermSearch = searchTerms.slice(1).map((term) => `${term}:*`).join(' & '); // Slice to remove firstTerm, map to add prefix matching, join to create a single search that can be run
    //       const lastTermSearch = searchTerms.slice(1).join(" ");
    //       firstLastSearchResults = await prisma.user.findMany({
    //         where: {
    //           id: {
    //             notIn: [...results.map((user) => user.id), req.user.id],
    //           },
    //           OR: [
    //             {
    //               AND: [
    //                 {
    //                   first_name: {
    //                     startsWith: firstTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //  { search: firstTermSearch }
    //                 },
    //                 {
    //                   last_name: {
    //                     startsWith: lastTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   // {search: lastTermSearch }
    //                 },
    //               ],
    //             },
    //             {
    //               AND: [
    //                 {
    //                   first_name: {
    //                     startsWith: lastTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //{ search: lastTermSearch }
    //                 },
    //                 {
    //                   last_name: {
    //                     startsWith: firstTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //{ search: firstTermSearch }
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //         select: {
    //           id: true,
    //           first_name: true,
    //           last_name: true,
    //           username: true,
    //         },
    //         take: currentCursor.limit,
    //         ...(currentCursor.page > 1 && {
    //           skip: currentCursor.page * currentCursor.limit,
    //         }),
    //       });

    //       results = [...firstLastSearchResults];
    //       let usernameSearchResults;
    //       // noDuplicate.push(...results.map((u) => u.id));
    //       if (firstLastSearchResults.length < 10) {
    //         usernameSearchResults = await prisma.user.findMany({
    //           where: {
    //             id: {
    //               notIn: [...results.map((user) => user.id), req.user.id],
    //             },
    //             username: { contains: usernameSearch, mode: "insensitive" },
    //           },
    //           select: {
    //             id: true,
    //             first_name: true,
    //             last_name: true,
    //             username: true,
    //           },
    //           take: currentCursor.limit - firstLastSearchResults.length,
    //         });
    //         results = results.concat(usernameSearchResults);
    //       }
    //     } else {
    //       // Basically if the user has searched where we think they could want a first and last name
    //       const firstTerm = searchTerms[0];
    //       //const firstTermSearch = `${firstTerm}:*`; // We add :* so that 'Jo' would find 'Joan' and 'Joanne' etc.
    //       const firstTermSearch = firstTerm;
    //       //const lastTermSearch = searchTerms.slice(1).map((term) => `${term}:*`).join(' & '); // Slice to remove firstTerm, map to add prefix matching, join to create a single search that can be run
    //       const lastTermSearch = searchTerms.slice(1).join(" ");
    //       firstLastSearchResults = await prisma.user.findMany({
    //         where: {
    //           id: {
    //             notIn: [...results.map((user) => user.id), req.user.id],
    //           },
    //           OR: [
    //             {
    //               AND: [
    //                 {
    //                   first_name: {
    //                     startsWith: firstTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //  { search: firstTermSearch }
    //                 },
    //                 {
    //                   last_name: {
    //                     startsWith: lastTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   // {search: lastTermSearch }
    //                 },
    //               ],
    //             },
    //             {
    //               AND: [
    //                 {
    //                   first_name: {
    //                     startsWith: lastTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //{ search: lastTermSearch }
    //                 },
    //                 {
    //                   last_name: {
    //                     startsWith: firstTermSearch,
    //                     mode: "insensitive",
    //                   },
    //                   //{ search: firstTermSearch }
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //         select: {
    //           id: true,
    //           first_name: true,
    //           last_name: true,
    //           username: true,
    //         },
    //         take: currentCursor.limit,
    //         ...(currentCursor.id && {
    //           cursor: { id: currentCursor.id },
    //           skip: 1,
    //         }),
    //       });

    //       results = [...firstLastSearchResults];
    //       let usernameSearchResults;
    //       // noDuplicate.push(...results.map((u) => u.id));
    //       if (firstLastSearchResults.length < 10) {
    //         usernameSearchResults = await prisma.user.findMany({
    //           where: {
    //             id: {
    //               notIn: [...results.map((user) => user.id), req.user.id],
    //             },
    //             username: { contains: usernameSearch, mode: "insensitive" },
    //           },
    //           select: {
    //             id: true,
    //             first_name: true,
    //             last_name: true,
    //             username: true,
    //           },
    //           take: currentCursor.limit - firstLastSearchResults.length,
    //         });
    //         results = results.concat(usernameSearchResults);
    //       }
    //     }
    //   } else {
    //     // If they are in secondary stage search (just username)
    //     if (currentCursor.type === "OFFSET" || currentCursor.type === "PAGE") {
    //       defaultSearch = await prisma.user.findMany({
    //         where: {
    //           id: {
    //             notIn: [...results.map((user) => user.id), req.user.id],
    //           },
    //           username: { contains: usernameSearch, mode: "insensitive" },
    //         },
    //         select: {
    //           id: true,
    //           first_name: true,
    //           last_name: true,
    //           username: true,
    //         },
    //         take: currentCursor.limit,
    //         ...(currentCursor.page > 1 && {
    //           skip: currentCursor.page * currentCursor.limit,
    //         }),

    //         orderBy: { id: "asc" },
    //       });

    //       results = [...defaultSearch];

    //       res.status(200).json({
    //         success: true,
    //         message: "User search results",
    //         data: {
    //           searchResults: results,
    //         },
    //       });
    //     } else {
    //       defaultSearch = await prisma.user.findMany({
    //         where: {
    //           id: {
    //             notIn: [...results.map((user) => user.id), req.user.id],
    //           },
    //           username: { contains: usernameSearch, mode: "insensitive" },
    //         },
    //         select: {
    //           id: true,
    //           first_name: true,
    //           last_name: true,
    //           username: true,
    //         },
    //         take: currentCursor.limit,
    //         ...(currentCursor.id && {
    //           cursor: { id: currentCursor.id },
    //           skip: 1,
    //         }),
    //         orderBy: { id: "asc" },
    //       });

    //       results = [...defaultSearch];

    //       res.status(200).json({
    //         success: true,
    //         message: "User search results",
    //         data: {
    //           searchResults: results,
    //         },
    //       });
    //     }
    //   }
    // } catch {}

    // Old code to be refactored and then commented out/ deleted
    // const { search, limit, page } = matchedData(req); //Collects the search from the request
    // const searchLimit = parseInt(limit, 10) || 10;
    // const fullSearch = search.trim().toLowerCase(); // Trims any surrounding spaces and get rid of any cases that may have been sent
    // const searchTerms = fullSearch.split(/\s+/).filter(Boolean); // Split search terms (for use later) and filter to remove any double spaces etc.
    // const usernameSearch = fullSearch.replace(/\s+/g, ""); // Remove whitespace but keep one single search term to search username
    // let nameSearch; // Used to alter search based on number of submitted terms
    // let results = []; // Creating the output here as I will be running multiple queries to fill up 10 results
    // let noDuplicate = [req.user.id];

    // if (searchTerms.length > 1) {
    //   // Basically if the user has searched where we think they could want a first and last name
    //   const firstTerm = searchTerms[0];
    //   //const firstTermSearch = `${firstTerm}:*`; // We add :* so that 'Jo' would find 'Joan' and 'Joanne' etc.
    //   const firstTermSearch = firstTerm;

    //   //const lastTermSearch = searchTerms.slice(1).map((term) => `${term}:*`).join(' & '); // Slice to remove firstTerm, map to add prefix matching, join to create a single search that can be run
    //   const lastTermSearch = searchTerms.slice(1).join(" ");

    //   firstLastSearchResults = await prisma.user.findMany({
    //     where: {
    //       id: {
    //         notIn: noDuplicate,
    //       },
    //       OR: [
    //         {
    //           AND: [
    //             {
    //               first_name: {
    //                 startsWith: firstTermSearch,
    //                 mode: "insensitive",
    //               },
    //               //  { search: firstTermSearch }
    //             },
    //             {
    //               last_name: {
    //                 startsWith: lastTermSearch,
    //                 mode: "insensitive",
    //               },
    //               // {search: lastTermSearch }
    //             },
    //           ],
    //         },
    //         {
    //           AND: [
    //             {
    //               first_name: {
    //                 startsWith: lastTermSearch,
    //                 mode: "insensitive",
    //               },
    //               //{ search: lastTermSearch }
    //             },
    //             {
    //               last_name: {
    //                 startsWith: firstTermSearch,
    //                 mode: "insensitive",
    //               },
    //               //{ search: firstTermSearch }
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     select: { id: true, first_name: true, last_name: true, username: true },
    //     take: searchLimit,
    //   });

    //   results = [...firstLastSearchResults];
    //   let usernameSearchResults;
    //   noDuplicate.push(...results.map((u) => u.id));

    //   if (firstLastSearchResults.length < 10) {
    //     usernameSearchResults = await prisma.user.findMany({
    //       where: {
    //         id: {
    //           notIn: noDuplicate,
    //         },
    //         username: { contains: usernameSearch, mode: "insensitive" },
    //       },
    //       select: {
    //         id: true,
    //         first_name: true,
    //         last_name: true,
    //         username: true,
    //       },
    //       take: searchLimit - firstLastSearchResults.length,
    //     });
    //     results = results.concat(usernameSearchResults);
    //   }
    // } else {
    //   // User is only searching one name
    //   const singleTerm = searchTerms[0];

    //   usernameSearchResults = await prisma.user.findMany({
    //     where: {
    //       id: {
    //         notIn: noDuplicate,
    //       },
    //       username: { contains: usernameSearch, mode: "insensitive" },
    //     },
    //     select: { id: true, first_name: true, last_name: true, username: true },
    //     take: searchLimit,
    //   });

    //   results = [...usernameSearchResults];
    //   let firstLastSearchResults;
    //   noDuplicate.push(...results.map((u) => u.id));

    //   if (usernameSearchResults.length < 10) {
    //     firstLastSearchResults = await prisma.user.findMany({
    //       where: {
    //         id: {
    //           notIn: noDuplicate,
    //         },
    //         OR: [
    //           {
    //             last_name: { startsWith: singleTerm, mode: "insensitive" },
    //             // { search: singleTerm }
    //           },
    //           {
    //             first_name: { startsWith: singleTerm, mode: "insensitive" },
    //             // { search: singleTerm }
    //           },
    //         ],
    //       },
    //       select: {
    //         id: true,
    //         first_name: true,
    //         last_name: true,
    //         username: true,
    //       },
    //       take: searchLimit - usernameSearchResults.length,
    //     });
    //     results = results.concat(firstLastSearchResults);
    //   }
    // }
    // res.status(200).json({
    //   success: true,
    //   message: "User search results",
    //   data: {
    //     searchResults: results,
    //   },
    //   pagination: {
    //     page: page,
    //     limit: searchLimit,
    //   },
    // });
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
      const searchInDB = await prisma.user.findMany({
        where: {
          id: searchId,
        },
      });
      if (searchInDB.length < 1) {
        res.status(404).json({
          success: false,
          message: "Cant find user",
        });
      } else {
        // Check if friendship connection exists
        const friendshipCheck = await prisma.friendship.findMany({
          where: {
            OR: [
              {
                AND: [
                  {
                    senderId: userId,
                  },
                  {
                    receiverId: searchId,
                  },
                ],
              },
              {
                AND: [
                  {
                    senderId: searchId,
                  },
                  {
                    receiverId: userId,
                  },
                ],
              },
            ],
          },
        });
        if (friendshipCheck.length < 1) {
          const friendshipUpdate = await prisma.friendship.create({
            data: {
              senderId: userId,
              receiverId: searchId,
            },
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
    const friendshipRequests = await prisma.friendship.findMany({
      where: {
        AND: [{ receiverId: req.user.id }, { status: "PENDING" }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
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
    const friendshipRequests = await prisma.friendship.findMany({
      where: {
        AND: [{ senderId: req.user.id }, { status: "PENDING" }],
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
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
  patchFriendRequestAccept: async (req, res, next) => {
    try {
      // Find the request they are trying to accept
      const request = await prisma.friendship.findUnique({
        where: {
          id: req.params.requestId,
        },
      });

      const newStatus = req.body.status;

      if (request) {
        // If the request is actually sent to them
        if (request.receiverId === req.user.id) {
          // If the status is pending
          if (request.status === "PENDING") {
            // Update the status in the DB
            const updatedStatus = await prisma.friendship.update({
              where: { id: req.params.requestId },
              data: { status: newStatus },
            });
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
  getFriends: async (req, res, next) => {},
};

export default indexController;
