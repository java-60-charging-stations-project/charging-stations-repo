import { useEffect, useMemo, useState } from "react";
import { fetchUserSessions } from "@/services/api/userApi";
import type { Session, SessionState } from "@/types/sessions";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function SessionStatusBadge({ state }: { state: SessionState }) {
  const variants: Record<SessionState, string> = {
    BOOKED: "bg-blue-100 text-blue-800 border-blue-300",
    ACTIVE: "bg-green-100 text-green-800 border-green-300",
    UNPAID: "bg-amber-100 text-amber-800 border-amber-300",
  };

  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${variants[state]}`}>
      {state}
    </span>
  );
}

function SessionsSection({
  title,
  sessions,
  emptyMessage,
}: {
  title: string;
  sessions: Session[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-500">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <article key={session.sessionId} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Session {session.sessionId}</p>
                  <p className="text-xs text-slate-500">Station {session.stationId}</p>
                </div>
                <SessionStatusBadge state={session.state} />
              </div>

              <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <p><span className="font-medium">Port:</span> {session.portCode}</p>
                <p><span className="font-medium">User:</span> {session.userId}</p>
                <p><span className="font-medium">Created:</span> {formatDate(session.createdAt)}</p>
                <p><span className="font-medium">Updated:</span> {formatDate(session.updatedAt)}</p>
                <p className="md:col-span-2 break-all">
                  <span className="font-medium">Entity key:</span> {session.entityKey}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const UserDashboardPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchUserSessions();
        if (!cancelled) {
          setSessions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const bookedSessions = useMemo(
    () => sessions.filter((session) => session.state === "BOOKED"),
    [sessions],
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.state === "ACTIVE"),
    [sessions],
  );
  const unpaidSessions = useMemo(
    () => sessions.filter((session) => session.state === "UNPAID"),
    [sessions],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-center">User dashboard</h1>
      </div>

      {isLoading && (
        <p className="text-center text-slate-500">Loading sessions...</p>
      )}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4">
          <SessionsSection
            title="My booked sessions"
            sessions={bookedSessions}
            emptyMessage="You don't have booked sessions"
          />
          <SessionsSection
            title="My active sessions"
            sessions={activeSessions}
            emptyMessage="You don't have active sessions"
          />
          <SessionsSection
            title="My unpaid sessions"
            sessions={unpaidSessions}
            emptyMessage="You don't have unpaid sessions"
          />
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;