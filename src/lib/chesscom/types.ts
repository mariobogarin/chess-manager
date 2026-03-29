export interface ChessComArchiveList {
  archives: string[]; // URLs like "https://api.chess.com/pub/player/{username}/games/2024/01"
}

export interface ChessComGameArchive {
  games: ChessComGame[];
}

export interface ChessComGame {
  url: string;
  pgn?: string;
  time_control: string;
  end_time: number; // unix timestamp
  rated: boolean;
  rules: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  eco?: string;
  opening?: string;
  initial_setup?: string;
  fen?: string;
  tcn?: string;
  uuid: string;
  accuracies?: {
    white: number;
    black: number;
  };
}

export interface ChessComPlayer {
  rating: number;
  result: string;
  "@id": string;
  username: string;
  uuid: string;
}

export interface ImportProgress {
  status: "fetching_archives" | "fetching_games" | "storing" | "done" | "error";
  totalArchives: number;
  processedArchives: number;
  gamesImported: number;
  gamesSkipped: number;
  error?: string;
}
