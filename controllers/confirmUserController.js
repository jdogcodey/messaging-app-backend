import prisma from "../config/prisma-client";
import { db } from "../src/prisma/db.ts";

async function confirmUserController(req, res, next) {
  // Request the receiver from the database
  // const receiver = await prisma.user.findUnique({
  //   where: {
  //     id: req.params.receiverId,
  //   },
  // });
  const receiver = await db.orm.public.User.where({
    id: req.params.receiverId,
  }).first();
  //
  if (!receiver) {
    return res.status(404).json({
      success: false,
      message: "Receiver not found",
    });
  } else next();
}

export default confirmUserController;
