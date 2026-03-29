-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chess_com',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalGameId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pgn" TEXT NOT NULL,
    "timeControl" TEXT,
    "endTime" DATETIME,
    "rated" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT NOT NULL DEFAULT 'chess',
    "whiteUsername" TEXT NOT NULL,
    "blackUsername" TEXT NOT NULL,
    "whiteRating" INTEGER,
    "blackRating" INTEGER,
    "result" TEXT NOT NULL,
    "eco" TEXT,
    "opening" TEXT,
    "initialFen" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoveAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "plyIndex" INTEGER NOT NULL,
    "san" TEXT NOT NULL,
    "fenBefore" TEXT NOT NULL,
    "fenAfter" TEXT NOT NULL,
    "bestMove" TEXT,
    "bestLine" TEXT,
    "evalBefore" REAL,
    "evalAfter" REAL,
    "evalLoss" REAL,
    "classification" TEXT,
    "detectedTags" TEXT NOT NULL DEFAULT '[]',
    "explanationShort" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MoveAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameAnalysisSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultCategory" TEXT,
    "openingPhaseIssues" TEXT NOT NULL DEFAULT '[]',
    "middlegameIssues" TEXT NOT NULL DEFAULT '[]',
    "endgameIssues" TEXT NOT NULL DEFAULT '[]',
    "majorFindings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameAnalysisSummary_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerProfileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "sampleGameIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatternSummary_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_username_key" ON "PlayerProfile"("username");

-- CreateIndex
CREATE INDEX "PlayerProfile_username_idx" ON "PlayerProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalGameId_key" ON "Game"("externalGameId");

-- CreateIndex
CREATE INDEX "Game_playerProfileId_idx" ON "Game"("playerProfileId");

-- CreateIndex
CREATE INDEX "Game_externalGameId_idx" ON "Game"("externalGameId");

-- CreateIndex
CREATE INDEX "Game_endTime_idx" ON "Game"("endTime");

-- CreateIndex
CREATE INDEX "MoveAnalysis_gameId_idx" ON "MoveAnalysis"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "MoveAnalysis_gameId_plyIndex_key" ON "MoveAnalysis"("gameId", "plyIndex");

-- CreateIndex
CREATE UNIQUE INDEX "GameAnalysisSummary_gameId_key" ON "GameAnalysisSummary"("gameId");

-- CreateIndex
CREATE INDEX "GameAnalysisSummary_gameId_idx" ON "GameAnalysisSummary"("gameId");

-- CreateIndex
CREATE INDEX "PatternSummary_playerProfileId_idx" ON "PatternSummary"("playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PatternSummary_playerProfileId_key_key" ON "PatternSummary"("playerProfileId", "key");
