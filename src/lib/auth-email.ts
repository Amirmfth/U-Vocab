type AuthEmailKind = "email-verification" | "password-reset";

type AuthEmail = {
  kind: AuthEmailKind;
  to: string;
  subject: string;
  text: string;
  url: string;
};

function configuredEmail() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export async function sendAuthEmail(message: AuthEmail) {
  const configured = configuredEmail();

  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[auth-email:${message.kind}] Development delivery for ${message.to}: ${message.url}`,
      );
      return;
    }
    throw new Error(
      "Authentication email delivery is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configured.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: configured.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Authentication email delivery failed", {
      kind: message.kind,
      status: response.status,
      response: body.slice(0, 300),
    });
    throw new Error("Could not send authentication email.");
  }
}
