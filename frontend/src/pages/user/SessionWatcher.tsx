import { config } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";
import { useGetSessionsQuery } from "@/store/apiSlice";

const pollingInterval = config.userSessionsPollingInterval;

const SessionWatcher = () => {
  const { userRole } = useAuth();

  useGetSessionsQuery(undefined, {
    pollingInterval: userRole === 'USER' ? pollingInterval : 0,
    skip: userRole !== 'USER',
    skipPollingIfUnfocused: false,
    refetchOnReconnect: true,
  });

  return null;
};

export default SessionWatcher;