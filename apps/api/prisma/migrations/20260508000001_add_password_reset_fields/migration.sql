-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetCode" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordResetRequestedAt" TIMESTAMP(3);

