import type { Session, SessionState } from "@/types/sessions";
import { useGetSessionsQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";
import { getLogger } from "@/services/logging";

const logger = getLogger("User.Dashboard");

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
}: {
  title: string;
  sessions: Session[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-500">{sessions.length}</span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <article key={session.sessionId} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session.state === "BOOKED"
                    ? `You have a booked session at the '${session.entityKey}' station`
                    : `Session ${session.sessionId}`
                  }
                </p>
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
    </section>
  );
}

const UserDashboardPage = () => {
  const { data, isLoading, error } = useGetSessionsQuery(
    undefined,
    {
      pollingInterval: 5000,
      skipPollingIfUnfocused: true,
      refetchOnReconnect: true,
    }
  );
  logger.debug("Data from hook: ", data);


  const bookedSessions = data?.sessions.filter((session) => session.state === "BOOKED") ?? [];
  const activeSessions = data?.sessions.filter((session) => session.state === "ACTIVE") ?? [];
  const unpaidSessions = data?.sessions.filter((session) => session.state === "UNPAID") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-center">User dashboard</h1>
      </div>

      {isLoading && (
        <EasySpinner />
      )}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4">
          {bookedSessions.length > 0 && (
            <SessionsSection
              title="Booked sessions"
              sessions={bookedSessions}
            />
          )}
          {activeSessions.length > 0 && (
            <SessionsSection
              title="Active sessions"
              sessions={activeSessions}
            />
          )}
          {unpaidSessions.length > 0 && (
            <SessionsSection
              title="Unpaid sessions"
              sessions={unpaidSessions}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;