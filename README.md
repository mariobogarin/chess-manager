# Chess Improvement Coach

Analyze your Chess.com games with Stockfish and get human-readable feedback on recurring mistakes.

## Features

- **Game import** — fetch all public games from Chess.com automatically
- **Board review** — navigate any game move by move with highlighted squares
- **Stockfish analysis** — per-move engine evaluation and best move suggestions
- **Move classification** — good / inaccuracy / mistake / blunder
- **Pattern detection** — hanging pieces, ignored threats, delayed castling, poor opening development, squandered advantages
- **Human-readable feedback** — plain-English explanations per move
- **Dashboard** — win/loss stats, time control breakdown, top recurring patterns

## Stack

- Next.js 15 (App Router)
- TypeScript + Tailwind CSS
- Prisma + SQLite
- chess.js (PGN parsing, FEN generation)
- react-chessboard (board rendering)
- Stockfish (local engine, UCI protocol)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if needed. The defaults work for local development.

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` (SQLite) and generates the Prisma client.

### 4. Install Stockfish

Stockfish must be installed locally for game analysis. Import and board navigation work without it.

**macOS (Homebrew):**
```bash
brew install stockfish
```

**Linux (apt):**
```bash
sudo apt install stockfish
```

**Custom path:**

Add to your `.env`:
```
STOCKFISH_PATH=/path/to/stockfish
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. Enter your Chess.com username on the home screen and click **Import games**.
2. After import completes, you'll be redirected to your dashboard.
3. Click any game to open the board review page.
4. Click **Analyze game** to run Stockfish analysis (requires Stockfish installed).
5. Navigate moves with arrow keys or the move list.
6. After analysis, each move shows its classification, evaluation, and explanation.
7. Your dashboard shows aggregated pattern statistics over all analyzed games.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Home / import screen
│   ├── dashboard/[username]/       # Player dashboard
│   ├── games/                      # Games list
│   ├── game/[id]/                  # Game review
│   └── api/
│       ├── import/                 # POST: import Chess.com games
│       ├── games/[id]/             # GET: game detail + plies
│       ├── games/[id]/analyze/     # POST: run Stockfish analysis
│       └── dashboard/[username]/   # GET: dashboard summary
├── components/
│   ├── BoardView.tsx               # Chessboard + navigation controls
│   ├── MoveList.tsx                # Move list with classification badges
│   ├── AnalysisPanel.tsx           # Per-move analysis panel
│   ├── GameCard.tsx                # Game summary card
│   ├── ClassificationBadge.tsx
│   └── PatternBadge.tsx
└── lib/
    ├── chesscom/importer.ts        # Chess.com API client + game import
    ├── pgn/parser.ts               # PGN parsing, FEN generation, board utilities
    ├── stockfish/engine.ts         # Stockfish UCI communication
    ├── analysis/
    │   ├── classifier.ts           # Move classification thresholds
    │   └── analyzer.ts             # Full game analysis orchestration
    ├── patterns/                   # Pattern detectors (one file per pattern)
    │   ├── hangingPiece.ts
    │   ├── ignoringThreat.ts
    │   ├── kingSafety.ts
    │   ├── openingDevelopment.ts
    │   └── losingAdvantage.ts
    └── feedback/templates.ts       # Deterministic explanation templates
```

---

## Tuning

### Move classification thresholds

Edit `src/lib/analysis/classifier.ts`:

```ts
export const CLASSIFICATION_THRESHOLDS = {
  great: -50,       // eval improves by 50+ cp
  good: 30,         // loss <= 30 cp
  inaccuracy: 60,   // loss <= 60 cp
  mistake: 120,     // loss <= 120 cp
  // above = blunder
};
```

### Stockfish depth / time

Edit `src/lib/stockfish/engine.ts`:

```ts
export const DEFAULT_CONFIG: StockfishConfig = {
  depth: 16,
  movetime: 1000, // ms per position
  multiPV: 1,
};
```

Reduce `depth` and `movetime` for faster analysis on slower machines.
