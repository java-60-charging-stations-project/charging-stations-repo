import { useGetCompletedSessionsQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";
import SessionCard from "@/components/SessionCard";
import RefetchIconButton from "@/components/RefetchIconButton";
import type { Session } from "@/types/sessions";

const sessionCompareByTime(a: Session, b: Session): number {
  if (!a.endedAt) {
    return -1;
  }
  else if (!b.endedAt) {
    return 1;
  }
  
  return b.endedAt.localeCompare(a.endedAt);
}

const UserRecentSessionsPage = () => {
  const { data, isLoading, error, refetch } = useGetCompletedSessionsQuery();

  const unpaidSessions = data?.filter((s) => s.state === "UNPAID").sort(sessionCompareByTime) ?? [];
  const paidSessions = data?.filter((s) => s.state === "PAID").sort(sessionCompareByTime) ?? [];
  const failedSessions = data?.filter((s) => s.state === "FAILED").sort(sessionCompareByTime) ?? [];

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div className="relative flex items-center justify-center">
        <h1 className="text-2xl font-bold">Recent sessions</h1>
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
          {failedSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Recent failed sessions
              </h2>
              <div className="space-y-3">
                {failedSessions.map((s) => (
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

          {paidSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Paid sessions
              </h2>
              <div className="space-y-3">
                {paidSessions.map((s) => (
                  <SessionCard key={s.sessionId} session={s} />
                ))}
              </div>
            </section>
          )}

          {unpaidSessions.length === 0 && paidSessions.length === 0 && (
            <p className="text-center text-sm text-slate-500">
              No recent sessions
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserRecentSessionsPage;
