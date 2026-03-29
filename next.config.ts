import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-side node modules (Stockfish child process, Prisma)
  serverExternalPackages: ["@prisma/client", "chess.js"],
};

export default nextConfig;
