import { useCallback, useEffect, useRef, useState } from "react";
import { getLogger } from "@/services/logging";
import { config } from "@/config/env";

const DEFAULT_POLLING_INTERVAL = "30000";
const configPollingInterval = Number(config.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL);

const logger = getLogger("usePolling");

type PollingOptions = {
    intervalMs?: number;
    enabled?: boolean;
    refreshKey?: number;
}

export function usePolling<T>(fetchMethod: () => Promise<T>, options: PollingOptions) {
    const {
        enabled = true,
        intervalMs = configPollingInterval,
        refreshKey,
    } = options;

    const isMountedRef = useRef(true); // Component unmount guard
    const fetcherRef = useRef(fetchMethod);
    const requestIdRef = useRef(0);

    const [loading, setLoading] = useState<boolean>(false);
    const [refetching, setRefetching] = useState<boolean>(false);
    const [fetched, setFetched] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);

    fetcherRef.current = fetchMethod;
    const executeFetch = useCallback(
        async (isInitial: boolean = false) => {
            setError(null);
            if (isInitial) {
                setLoading(true);
            } else {
                setRefetching(true);
            }
            const requestId = ++requestIdRef.current;
            try {
                const response = await fetcherRef.current();
                if (requestId === requestIdRef.current && isMountedRef.current) {
                    logger.debug("Successfully loaded, response=", response);
                    setFetched(response);
                }
                else {
                    logger.debug("The fetch result is ignored, Reason: ", {
                        staleRequest: requestId !== requestIdRef.current,
                        unmounted: !isMountedRef.current
                    });
                }
            }
            catch (e) {
                if (requestId === requestIdRef.current && isMountedRef.current) {
                    logger.error("Error fetching data: ", e);
                    setError(e instanceof Error ? e.message : String(e));
                }
            }
            finally {
                if (requestId === requestIdRef.current && isMountedRef.current) {
                    setLoading(false);
                    setRefetching(false);
                }
            }
        }
        , []
    );

    useEffect( () => {
        if (!enabled) {
            return;
        }

        void executeFetch(true);

        const intervalId = setInterval(() => executeFetch(false), intervalMs);

        return () => { clearInterval(intervalId); };
    }, [executeFetch, refreshKey, enabled, intervalMs]);

    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);
    
    return { loading, refetching, fetched, error, refresh: executeFetch };
};