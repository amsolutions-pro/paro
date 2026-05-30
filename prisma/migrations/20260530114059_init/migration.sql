-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ParonymGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "summary" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "posClass" TEXT NOT NULL,
    "translationHy" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "origin" TEXT,
    "synonyms" TEXT,
    "examples" TEXT NOT NULL,
    "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Word_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParonymGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gradingMode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "commentary" TEXT NOT NULL,
    "groupId" TEXT,
    "posClass" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExerciseItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParonymGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attempt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ExerciseItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "ease" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewState_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParonymGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ParonymGroup_slug_key" ON "ParonymGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseItem_slug_key" ON "ExerciseItem"("slug");

-- CreateIndex
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewState_userId_nextReview_idx" ON "ReviewState"("userId", "nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_groupId_key" ON "ReviewState"("userId", "groupId");
