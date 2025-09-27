/*
  Warnings:

  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MessageRecipient` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."MessageRecipient" DROP CONSTRAINT "MessageRecipient_messageId_fkey";

-- AlterTable
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Message_id_seq";

-- AlterTable
ALTER TABLE "public"."MessageRecipient" DROP CONSTRAINT "MessageRecipient_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "messageId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MessageRecipient_id_seq";

-- AddForeignKey
ALTER TABLE "public"."MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
