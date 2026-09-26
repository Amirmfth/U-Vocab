export function formatRelativeReviewTime(target: Date, now = new Date()) {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "due now";

  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return "in " + minutes + " min";

  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 24) return "in " + hours + (hours === 1 ? " hour" : " hours");

  const days = Math.round(diffMs / 86_400_000);
  if (days < 30) return "in " + days + (days === 1 ? " day" : " days");

  const months = Math.round(days / 30);
  if (months < 12) return "in " + months + (months === 1 ? " month" : " months");

  const years = Math.round(days / 365);
  return "in " + years + (years === 1 ? " year" : " years");
}
