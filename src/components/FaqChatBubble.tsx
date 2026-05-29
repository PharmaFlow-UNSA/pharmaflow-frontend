import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  HelpCircle,
  Loader2,
  MessageCircle,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createChatMessage, createChatSession, askChatbot } from "@/api/chatbot";
import { getFaqEntries } from "@/api/faqs";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { FaqCategory } from "@/types/api";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  matchedQuestion?: string | null;
  category?: FaqCategory | null;
  confidence?: number | null;
  fallback?: boolean;
};

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 2;

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    sender: "bot",
    text: "Hi, I can help with PharmaFlow questions about orders, prescriptions, products, payments, and account support.",
  },
];

const categoryLabel: Record<FaqCategory, string> = {
  ORDERS: "Orders",
  PRESCRIPTIONS: "Prescriptions",
  DELIVERY: "Delivery",
  PAYMENTS: "Payments",
  ACCOUNT: "Account",
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function FaqChatBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const auditSessionIdRef = useRef<number | null>(null);
  const auditSessionPromiseRef = useRef<Promise<number | null> | null>(null);

  const suggestionsQuery = useQuery({
    queryKey: ["faqs", "bubble-suggestions"],
    queryFn: getFaqEntries,
    enabled: open,
    staleTime: 60_000,
  });

  const suggestions = useMemo(
    () => (suggestionsQuery.data ?? []).filter((faq) => faq.isActive).slice(0, 4),
    [suggestionsQuery.data]
  );

  const trimmedMessage = message.trim();
  const validationMessage = useMemo(() => {
    if (!trimmedMessage) return null;
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      return "Ask at least 2 characters.";
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return "Questions must be 2000 characters or fewer.";
    }
    return null;
  }, [trimmedMessage]);

  const canSend = Boolean(trimmedMessage) && !validationMessage;

  const mutation = useMutation({
    mutationFn: askChatbot,
    onSuccess: (response) => {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          sender: "bot",
          text: response.answer,
          matchedQuestion: response.matchedQuestion,
          category: response.category,
          confidence: response.confidence,
          fallback: response.fallback,
        },
      ]);
      void logAuditMessage("BOT", null, response.answer);
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          sender: "bot",
          text: "I couldn't reach the FAQ service. Please try again in a moment.",
          fallback: true,
        },
      ]);
    },
  });

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, mutation.isPending, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || mutation.isPending) return;

    const outboundMessage = trimmedMessage;
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        sender: "user",
        text: outboundMessage,
      },
    ]);
    setMessage("");
    void logAuditMessage("USER", user?.userId ?? null, outboundMessage);
    mutation.mutate({ message: outboundMessage });
  };

  const applySuggestion = (question: string) => {
    setMessage(question);
    inputRef.current?.focus();
  };

  const ensureAuditSession = async (): Promise<number | null> => {
    if (!user?.userId) return null;
    if (auditSessionIdRef.current) return auditSessionIdRef.current;
    if (auditSessionPromiseRef.current) return auditSessionPromiseRef.current;

    auditSessionPromiseRef.current = createChatSession({
      userId: user.userId,
      patientProfileId: null,
      sessionType: "FAQ_BOT",
    })
      .then((session) => {
        auditSessionIdRef.current = session.id;
        return session.id;
      })
      .catch(() => null)
      .finally(() => {
        auditSessionPromiseRef.current = null;
      });

    return auditSessionPromiseRef.current;
  };

  const logAuditMessage = async (
    senderType: "USER" | "BOT",
    senderId: number | null,
    messageText: string
  ) => {
    try {
      const sessionId = await ensureAuditSession();
      if (!sessionId) return;
      await createChatMessage(sessionId, {
        senderType,
        senderId,
        messageText,
        attachmentUrl: null,
      });
    } catch {
      // Audit logging must never block or alter the user's chatbot answer flow.
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="FAQ assistant"
          className="mb-4 flex max-h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:w-[380px]"
        >
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-5">FAQ Assistant</h2>
                <p className="truncate text-xs text-slate-300">Answers from PharmaFlow support FAQs</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close FAQ assistant"
              onClick={() => setOpen(false)}
              className="h-8 w-8 shrink-0 text-white hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <div
            ref={scrollRef}
            className="flex min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-4 py-4"
          >
            {messages.length === 1 && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-slate-500">Suggested questions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => applySuggestion(faq.question)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((chatMessage) => (
              <ChatMessageBubble key={chatMessage.id} message={chatMessage} />
            ))}
            {mutation.isPending && (
              <div className="flex items-start gap-2">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Searching FAQs...
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <label htmlFor="faq-chat-message" className="sr-only">
                Ask the FAQ assistant
              </label>
              <input
                ref={inputRef}
                id="faq-chat-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={mutation.isPending}
                maxLength={MAX_MESSAGE_LENGTH + 1}
                placeholder="Ask a question..."
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canSend || mutation.isPending}
                aria-label="Send question"
                className="shrink-0"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-xs">
              <p className={cn("text-slate-500", validationMessage && "text-red-700")}>
                {validationMessage ?? "For medical advice, contact a licensed pharmacist."}
              </p>
              <span className="shrink-0 text-slate-400">
                {trimmedMessage.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </form>
        </section>
      )}

      <Button
        type="button"
        size="icon"
        aria-label={open ? "Close FAQ assistant" : "Open FAQ assistant"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="h-14 w-14 rounded-full shadow-lg shadow-slate-300/70"
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";

  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-slate-200 text-slate-700" : "bg-brand-100 text-brand-700"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Bot className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <div
        className={cn(
          "max-w-[78%] rounded-lg px-3 py-2 text-sm leading-5",
          isUser
            ? "bg-brand-600 text-white"
            : "border border-slate-200 bg-white text-slate-800"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {!isUser && !message.fallback && (message.matchedQuestion || message.category) && (
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              {message.category && <Badge variant="info">{categoryLabel[message.category]}</Badge>}
              {typeof message.confidence === "number" && (
                <span>{Math.round(message.confidence * 100)}% confidence</span>
              )}
            </div>
            {message.matchedQuestion && (
              <p className="flex items-start gap-1.5">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="break-words">Matched FAQ: {message.matchedQuestion}</span>
              </p>
            )}
          </div>
        )}
        {!isUser && message.fallback && (
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
            No confident FAQ match was found.
          </p>
        )}
      </div>
    </div>
  );
}
