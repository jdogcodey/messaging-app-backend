import prisma from "../config/prisma-client";

async function confirmUserController(req, res, next) {
  // Request the receiver from the database
  const receiver = await prisma.user.findUnique({
    where: {
      id: req.params.receiverId,
    },
  });
  //
  if (!receiver) {
    return res.status(404).json({});
  } else return res.status(400).json({});
}

export default confirmUserController;
