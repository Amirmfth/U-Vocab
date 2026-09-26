"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, UserRound } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

export function ConversationChat({
  sessionId,
  initialMessages,
  tutorLabel,
}: {
  sessionId: string;
  initialMessages: ChatMessage[];
  tutorLabel: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temporaryId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!streaming) setMessages(initialMessages);
  }, [initialMessages, streaming]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
  }, [messages, streaming]);

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
      requestAnimationFrame(() => textareaRef.current?.focus());
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
        {messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <article
              className={"conversation-message " + (isUser ? "is-user" : "is-assistant")}
              key={message.id}
            >
              <div className="conversation-avatar" aria-hidden="true">
                {isUser ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="conversation-bubble">
                <span>{isUser ? "You" : tutorLabel}</span>
                <p>
                  {message.content ||
                    (streaming && !isUser ? "…" : "")}
                </p>
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="conversation-composer" onSubmit={submit}>
        <textarea
          ref={textareaRef}
          rows={2}
          value={draft}
          disabled={streaming}
          placeholder="Antworte auf Deutsch…"
          aria-label="Your German reply"
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
          className="conversation-send-button"
          disabled={!canSend}
          aria-busy={streaming}
          aria-label={streaming ? "Tutor is replying" : "Send message"}
          title={streaming ? "Tutor is replying…" : "Send · Enter"}
        >
          <Send size={18} />
        </button>
        <span className="conversation-composer-hint">
          Enter to send · Shift + Enter for a new line
        </span>
      </form>

      {error ? (
        <p className="conversation-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
