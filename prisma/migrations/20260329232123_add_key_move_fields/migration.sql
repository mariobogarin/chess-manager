-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MoveAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "plyIndex" INTEGER NOT NULL,
    "moveNumber" INTEGER NOT NULL DEFAULT 0,
    "side" TEXT NOT NULL DEFAULT 'w',
    "san" TEXT NOT NULL,
    "uci" TEXT,
    "fenBefore" TEXT NOT NULL,
    "fenAfter" TEXT NOT NULL,
    "bestMove" TEXT,
    "bestMoveSan" TEXT,
    "bestLine" TEXT,
    "principalVariation" TEXT NOT NULL DEFAULT '[]',
    "evalBefore" REAL,
    "evalAfter" REAL,
    "evalLoss" REAL,
    "classification" TEXT,
    "detectedTags" TEXT NOT NULL DEFAULT '[]',
    "explanationShort" TEXT,
    "isKeyMove" BOOLEAN NOT NULL DEFAULT false,
    "keyMoveScore" REAL NOT NULL DEFAULT 0,
    "keyReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MoveAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MoveAnalysis" ("bestLine", "bestMove", "classification", "createdAt", "detectedTags", "evalAfter", "evalBefore", "evalLoss", "explanationShort", "fenAfter", "fenBefore", "gameId", "id", "plyIndex", "san", "updatedAt") SELECT "bestLine", "bestMove", "classification", "createdAt", "detectedTags", "evalAfter", "evalBefore", "evalLoss", "explanationShort", "fenAfter", "fenBefore", "gameId", "id", "plyIndex", "san", "updatedAt" FROM "MoveAnalysis";
DROP TABLE "MoveAnalysis";
ALTER TABLE "new_MoveAnalysis" RENAME TO "MoveAnalysis";
CREATE INDEX "MoveAnalysis_gameId_idx" ON "MoveAnalysis"("gameId");
CREATE INDEX "MoveAnalysis_gameId_isKeyMove_idx" ON "MoveAnalysis"("gameId", "isKeyMove");
CREATE UNIQUE INDEX "MoveAnalysis_gameId_plyIndex_key" ON "MoveAnalysis"("gameId", "plyIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
