"use client";

const CLASSIFICATION_STYLES: Record<string, string> = {
  great: "bg-teal-100 text-teal-800 border-teal-200",
  good: "bg-green-100 text-green-800 border-green-200",
  book: "bg-gray-100 text-gray-600 border-gray-200",
  forced: "bg-gray-100 text-gray-500 border-gray-200",
  inaccuracy: "bg-yellow-100 text-yellow-800 border-yellow-200",
  mistake: "bg-orange-100 text-orange-800 border-orange-200",
  blunder: "bg-red-100 text-red-800 border-red-200",
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  great: "Great",
  good: "Good",
  book: "Book",
  forced: "Forced",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

interface Props {
  classification: string | null;
  size?: "sm" | "md";
}

export function ClassificationBadge({ classification, size = "sm" }: Props) {
  if (!classification) return null;
  const style = CLASSIFICATION_STYLES[classification] ?? "bg-gray-100 text-gray-600 border-gray-200";
  const label = CLASSIFICATION_LABELS[classification] ?? classification;
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span className={`inline-flex items-center rounded border font-medium ${style} ${sizeClass}`}>
      {label}
    </span>
  );
}
