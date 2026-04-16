import { useGetSessionsQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";
import SessionCard from "@/components/SessionCard";
import RefetchIconButton from "@/components/RefetchIconButton";
import { isFreshUnpaidSession } from "@/utils/sessionStatus";
import { config } from "@/config/env";

const pollingInterval = config.userSessionsPollingInterval;

const UserCurrentSessionPage = () => {
  const { data, isLoading, error, refetch } = useGetSessionsQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
    refetchOnReconnect: true,
  });

  const bookedSessions =
    data?.sessions.filter((s) => s.state === "BOOKED") ?? [];
  const activeSessions =
    data?.sessions.filter((s) => s.state === "ACTIVE") ?? [];
  const freshUnpaidSessions =
    data?.sessions.filter((s) => isFreshUnpaidSession(s)) ?? [];
  const unpaidSessions =
    data?.sessions.filter((s) => s.state === "UNPAID" && !isFreshUnpaidSession(s)) ?? [];

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-center">
        <h1 className="text-2xl font-bold">Your active sessions</h1>
        <div className="absolute right-0">
          <RefetchIconButton onClick={refetch} />
        </div>
      </div>

      {isLoading && <EasySpinner />}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {bookedSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Booked sessions
              </h2>
              <div className="space-y-3">
                {bookedSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} />
                ))}
              </div>
            </section>
          )}

          {activeSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Charging sessions
              </h2>
              <div className="space-y-3">
                {activeSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} />
                ))}
              </div>
            </section>
          )}

          {freshUnpaidSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Processing payment
              </h2>
              <div className="space-y-3">
                {freshUnpaidSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} />
                ))}
              </div>
            </section>
          )}

          {unpaidSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Unpaid sessions
              </h2>
              <div className="space-y-3">
                {unpaidSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} />
                ))}
              </div>
            </section>
          )}

          {bookedSessions.length === 0 &&
            activeSessions.length === 0 &&
            freshUnpaidSessions.length === 0 &&
            unpaidSessions.length === 0 && (
              <p className="text-center text-sm text-slate-500">
                No active sessions
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default UserCurrentSessionPage;
