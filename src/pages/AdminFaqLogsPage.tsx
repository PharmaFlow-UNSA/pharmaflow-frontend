import { useQueries, useQuery } from "@tanstack/react-query";
import { Activity, Bot, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { getChatIntentMatch, getChatMessages, getChatSessionsByUser } from "@/api/chatbot";
import { getUsers } from "@/api/users";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { ChatMessageDTO, ChatSessionDTO } from "@/types/api";

export function AdminFaqLogsPage() {
  const [draftUserId, setDraftUserId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", "faq-logs"],
    queryFn: () => getUsers({ page: 0, size: 100, sort: "email,asc" }),
  });

  const sessionsQuery = useQuery({
    queryKey: ["chat-sessions", userId],
    queryFn: () => getChatSessionsByUser(userId ?? 0),
    enabled: userId !== null,
  });

  const sessions = useMemo(
    () => (sessionsQuery.data ?? []).filter((session) => session.sessionType === "FAQ_BOT"),
    [sessionsQuery.data]
  );

  const effectiveSessionId =
    selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : sessions[0]?.id ?? null;

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", effectiveSessionId],
    queryFn: () => getChatMessages(effectiveSessionId ?? 0),
    enabled: effectiveSessionId !== null,
  });

  const messages = messagesQuery.data ?? [];
  const userMessages = messages.filter((message) => message.senderType === "USER");
  const intentQueries = useQueries({
    queries: userMessages.map((message) => ({
      queryKey: ["chat-intent-match", message.id],
      queryFn: () => getChatIntentMatch(message.id),
      retry: false,
    })),
  });

  const intentByMessageId = new Map(
    userMessages.map((message, index) => [message.id, intentQueries[index]?.data])
  );

  const applyFilter = () => {
    if (!draftUserId) {
      setFilterError("Choose an account to review.");
      return;
    }
    setFilterError(null);
    setSelectedSessionId(null);
    setUserId(draftUserId);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Bot}
        eyebrow="Conversation audit"
        title="FAQ audit logs"
        description="Review captured FAQ assistant sessions and intent matches for a selected account."
        stats={[
          { label: "Accounts loaded", value: usersQuery.isLoading ? "..." : usersQuery.data?.totalElements ?? 0 },
          { label: "FAQ sessions", value: sessionsQuery.isLoading ? "..." : sessions.length },
          { label: "Messages", value: messagesQuery.isLoading ? "..." : messages.length },
        ]}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="faq-log-account">Account</Label>
              <Select
                id="faq-log-account"
                value={draftUserId ? String(draftUserId) : ""}
                onChange={(event) => setDraftUserId(event.target.value ? Number(event.target.value) : null)}
                disabled={usersQuery.isLoading || (usersQuery.data?.content.length ?? 0) === 0}
              >
                <option value="">Select an account</option>
                {usersQuery.data?.content.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} · {user.email}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" onClick={applyFilter}>
              <Search className="mr-2 h-4 w-4" />
              Load logs
            </Button>
          </div>
          {filterError && <p className="mt-2 text-sm text-red-700">{filterError}</p>}
        </CardContent>
      </Card>

      {usersQuery.isError && <ErrorMessage error={usersQuery.error} />}
      {sessionsQuery.isError && <ErrorMessage error={sessionsQuery.error} />}
      {messagesQuery.isError && <ErrorMessage error={messagesQuery.error} />}

      <section className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
            <CardDescription>Review FAQ assistant sessions for the selected account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userId === null && (
              <EmptyState title="Choose an account" description="Select an account above to load FAQ bot sessions." />
            )}
            {sessionsQuery.isLoading && <p className="text-sm text-slate-500">Loading sessions...</p>}
            {userId !== null && !sessionsQuery.isLoading && sessions.length === 0 && (
              <p className="text-sm text-slate-600">No FAQ bot sessions found for this user.</p>
            )}
            {sessions.map((session) => (
              <SessionButton
                key={session.id}
                session={session}
                active={session.id === effectiveSessionId}
                onClick={() => setSelectedSessionId(session.id)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {effectiveSessionId ? `Messages for session #${effectiveSessionId}` : "Messages"}
            </CardTitle>
            <CardDescription>Read-only FAQ assistant audit trail.</CardDescription>
          </CardHeader>
          <CardContent>
            {!effectiveSessionId && <p className="text-sm text-slate-600">Select a session to view messages.</p>}
            {messagesQuery.isLoading && <p className="text-sm text-slate-500">Loading messages...</p>}
            {effectiveSessionId && !messagesQuery.isLoading && messages.length === 0 && (
              <p className="text-sm text-slate-600">No messages were recorded for this session.</p>
            )}
            <div className="space-y-3">
              {messages.map((message) => (
                <MessageLog
                  key={message.id}
                  message={message}
                  intent={intentByMessageId.get(message.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SessionButton({
  session,
  active,
  onClick,
}: {
  session: ChatSessionDTO;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "w-full rounded-md border border-brand-200 bg-brand-50 p-3 text-left"
          : "w-full rounded-md border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-900">Session #{session.id}</span>
        <Badge variant={session.status === "OPEN" ? "success" : "outline"}>{session.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">{formatDateTime(session.startedAt)}</p>
    </button>
  );
}

function MessageLog({
  message,
  intent,
}: {
  message: ChatMessageDTO;
  intent?: { detectedIntent: string; confidenceScore: number };
}) {
  const isUser = message.senderType === "USER";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isUser ? (
            <User className="h-4 w-4 text-slate-500" />
          ) : (
            <Bot className="h-4 w-4 text-brand-600" />
          )}
          <span className="font-medium text-slate-900">{message.senderType}</span>
          {intent && (
            <Badge variant="info">
              <Activity className="mr-1 h-3 w-3" />
              {intent.detectedIntent} {(intent.confidenceScore * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        <span className="text-xs text-slate-500">{formatDateTime(message.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {message.messageText ?? message.attachmentUrl ?? "No message content"}
      </p>
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
