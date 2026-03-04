-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "customFields" TEXT;

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appName" TEXT NOT NULL DEFAULT 'Gestão Celular',
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "logoUrl" TEXT,
    "loginMessage" TEXT,
    "congregationName" TEXT,
    "congregationAddress" TEXT,
    "pastorName" TEXT,
    "nucleus" TEXT,
    "cellCustomFields" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "leaderId" TEXT,
    "viceLeaderId" TEXT,
    "hostId" TEXT,
    "address" TEXT,
    "meetingDay" TEXT,
    "meetingTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "generationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cell_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Cell" ("address", "createdAt", "hostId", "id", "leaderId", "meetingDay", "meetingTime", "name", "status", "updatedAt", "viceLeaderId") SELECT "address", "createdAt", "hostId", "id", "leaderId", "meetingDay", "meetingTime", "name", "status", "updatedAt", "viceLeaderId" FROM "Cell";
DROP TABLE "Cell";
ALTER TABLE "new_Cell" RENAME TO "Cell";
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birthdate" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Visitante',
    "howKnown" TEXT,
    "previousCell" TEXT,
    "returnReason" TEXT,
    "prayerRequest" TEXT,
    "cellId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Person_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("address", "birthdate", "cellId", "createdAt", "email", "howKnown", "id", "name", "phone", "prayerRequest", "previousCell", "returnReason", "status", "updatedAt") SELECT "address", "birthdate", "cellId", "createdAt", "email", "howKnown", "id", "name", "phone", "prayerRequest", "previousCell", "returnReason", "status", "updatedAt" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "generationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatar", "createdAt", "id", "name", "password", "role", "updatedAt", "username") SELECT "avatar", "createdAt", "id", "name", "password", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Generation_name_key" ON "Generation"("name");
