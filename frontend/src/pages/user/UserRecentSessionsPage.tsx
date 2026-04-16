import { useGetCompletedSessionsQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";
import SessionCard from "@/components/SessionCard";

const UserRecentSessionsPage = () => {
  const { data, isLoading, error, refetch } = useGetCompletedSessionsQuery();

  const unpaidSessions = data?.filter((s) => s.state === "UNPAID") ?? [];
  const paidSessions = data?.filter((s) => s.state === "PAID") ?? [];

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-center text-2xl font-bold">Recent sessions</h1>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          onClick={refetch}
        >
          Refetch
        </button>
      </div>

      {isLoading && <EasySpinner />}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
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
