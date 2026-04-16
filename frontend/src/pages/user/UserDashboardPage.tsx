import { Link } from "react-router";
import { useGetSessionsQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";
import { getLogger } from "@/services/logging";
import { config } from "@/config/env";

const logger = getLogger("User.Dashboard");
const pollingInterval = config.userSessionsPollingInterval;

const UserDashboardPage = () => {
  const { data, isLoading, error } = useGetSessionsQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
    refetchOnReconnect: true,
  });
  logger.debug("Data from hook: ", data);

  const bookedSessions =
    data?.sessions.filter((s) => s.state === "BOOKED") ?? [];
  const activeSessions =
    data?.sessions.filter((s) => s.state === "ACTIVE") ?? [];
  const unpaidSessions =
    data?.sessions.filter((s) => s.state === "UNPAID") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">User dashboard</h1>

      {isLoading && <EasySpinner />}

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {bookedSessions.map((s) => (
            <p key={s.sessionId} className="text-sm text-slate-700">
              You have a booked session at the &lsquo;{s.entityKey}&rsquo;
              station
            </p>
          ))}

          {activeSessions.map((s) => (
            <p key={s.sessionId} className="text-sm text-slate-700">
              You have an active session at the &lsquo;{s.entityKey}&rsquo;
              station
            </p>
          ))}

          {unpaidSessions.map((s) => (
            <p key={s.sessionId} className="text-sm text-amber-700">
              You have an unpaid session at the &lsquo;{s.entityKey}&rsquo;
              station
            </p>
          ))}

          {(bookedSessions.length > 0 ||
            activeSessions.length > 0 ||
            unpaidSessions.length > 0) && (
            <Link
              to="session"
              className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to sessions
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboardPage;
