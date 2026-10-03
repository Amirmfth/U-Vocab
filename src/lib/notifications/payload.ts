export type ReviewReminderPayload = {
  type: "review_reminder";
  title: string;
  body: string;
  dueCount: number;
  url: "/review";
};

export function reviewReminderPayload(input: {
  locale: "EN" | "FA";
  dueCount: number;
}): ReviewReminderPayload {
  const dueCount = Math.max(1, Math.trunc(input.dueCount));
  if (input.locale === "FA") {
    return {
      type: "review_reminder",
      title: "مرور U-Vocab",
      body: `${dueCount.toLocaleString("fa-IR")} واژه برای مرور آماده است.`,
      dueCount,
      url: "/review",
    };
  }
  return {
    type: "review_reminder",
    title: "U-Vocab review",
    body: `You have ${dueCount.toLocaleString("en-US")} words ready for review.`,
    dueCount,
    url: "/review",
  };
}

export function sanitizeNotificationUrl(value: unknown) {
  return value === "/review" ? "/review" : "/review";
}
