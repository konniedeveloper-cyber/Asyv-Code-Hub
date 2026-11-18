export function formatProjectDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function kindLabel(kind: "link" | "files"): string {
  return kind === "link" ? "Link" : "HTML / CSS / JS";
}
