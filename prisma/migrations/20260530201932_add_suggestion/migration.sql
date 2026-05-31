-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);
