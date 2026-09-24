"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

export function ConversationChat({
  sessionId,
  initialMessages,
}: {
  sessionId: string;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!streaming) setMessages(initialMessages);
  }, [initialMessages, streaming]);
  const [error, setError] = useState<string | null>(null);
  const temporaryId = useRef(0);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !streaming,
    [draft, streaming],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || streaming) return;

    setDraft("");
    setError(null);
    setStreaming(true);

    const userId = "local-user-" + ++temporaryId.current;
    const assistantId = "local-assistant-" + ++temporaryId.current;

    setMessages((current) => [
      ...current,
      { id: userId, role: "USER", content: message },
      { id: assistantId, role: "ASSISTANT", content: "" },
    ]);

    try {
      const response = await fetch("/api/conversation/" + sessionId + "/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not send message.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, content: item.content + chunk }
              : item,
          ),
        );
      }

      router.refresh();
    } catch (actionError) {
      setMessages((current) =>
        current.filter((item) => item.id !== assistantId),
      );
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not continue the conversation.",
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="conversation-chat">
      <div className="conversation-messages" aria-live="polite">
        {messages.map((message) => (
          <article
            className={
              "conversation-message " +
              (message.role === "USER" ? "is-user" : "is-assistant")
            }
            key={message.id}
          >
            <span>{message.role === "USER" ? "You" : "Tutor"}</span>
            <p>
              {message.content ||
                (streaming && message.role === "ASSISTANT" ? "…" : "")}
            </p>
          </article>
        ))}
      </div>

      <form className="conversation-composer" onSubmit={submit}>
        <textarea
          rows={3}
          value={draft}
          disabled={streaming}
          placeholder="Antworte auf Deutsch…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={!canSend}
          aria-busy={streaming}
        >
          <Send size={17} />
          {streaming ? "Tutor is replying…" : "Send"}
        </button>
      </form>

      {error ? (
        <p className="conversation-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
