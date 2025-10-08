-- CreateTable
CREATE TABLE "UserCookie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cookie" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCookie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCookie_userId_key" ON "UserCookie"("userId");
