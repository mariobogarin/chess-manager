"use client";

import { TAG_LABELS } from "@/lib/analysis/tags";

const PATTERN_STYLES: Record<string, string> = {
  // New tags
  lost_advantage: "bg-pink-50 text-pink-700 border-pink-200",
  missed_castling: "bg-yellow-50 text-yellow-700 border-yellow-200",
  hung_piece: "bg-red-50 text-red-700 border-red-200",
  missed_tactic: "bg-red-50 text-red-700 border-red-200",
  missed_threat: "bg-orange-50 text-orange-700 border-orange-200",
  missed_development: "bg-blue-50 text-blue-700 border-blue-200",
  passive_move: "bg-gray-100 text-gray-600 border-gray-300",
  // Legacy pattern tags
  hanging_piece: "bg-red-50 text-red-700 border-red-200",
  ignoring_threat: "bg-orange-50 text-orange-700 border-orange-200",
  delayed_castling: "bg-yellow-50 text-yellow-700 border-yellow-200",
  king_center_danger: "bg-yellow-50 text-yellow-700 border-yellow-200",
  same_piece_repeated: "bg-blue-50 text-blue-700 border-blue-200",
  poor_development: "bg-blue-50 text-blue-700 border-blue-200",
  early_queen: "bg-purple-50 text-purple-700 border-purple-200",
  squandered_advantage: "bg-pink-50 text-pink-700 border-pink-200",
};

export function PatternBadge({ tag }: { tag: string }) {
  const style = PATTERN_STYLES[tag] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const label = TAG_LABELS[tag] ?? tag.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded border text-xs font-medium px-2 py-0.5 ${style}`}>
      {label}
    </span>
  );
}
