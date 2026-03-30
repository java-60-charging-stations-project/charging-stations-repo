import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import NavButton from "@/components/NavButton";
import SimpleButton from "@/components/SimpleButton";
import { fetchStationPorts } from "@/services/api/userApi";
import type { StationPort } from "@/types/stations";

const UserStationPage = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const [ports, setPorts] = useState<StationPort[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPorts = useCallback(async () => {
    if (!stationId) {
      setError("Missing station id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPorts = await fetchStationPorts(stationId);
      setPorts(nextPorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load station ports");
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadPorts();
  }, [loadPorts]);

  const freePortsCount = useMemo(
    () => ports.filter((port) => port.status === "FREE").length,
    [ports],
  );

  return (
    <div className="mx-auto mt-5 max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <NavButton to="/user/stations" caption="← Back to stations" />
      </div>

      <div className="space-y-1">
        <h1 className="text-center text-2xl font-bold">Station ports</h1>
        {stationId && (
          <p className="text-center text-sm text-slate-500">Station {stationId}</p>
        )}
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!error && (
        <p className="text-center text-base text-slate-700">
          {isLoading
            ? "Loading station ports..."
            : `The station has ${freePortsCount} free (of ${ports.length}) ports right now.`}
        </p>
      )}

      <div className="flex justify-center">
        <SimpleButton
          caption="Update"
          loadingCaption="Updating..."
          handleClick={() => void loadPorts()}
          isLoading={isLoading}
          isDisabled={!stationId}
        />
      </div>
    </div>
  );
};

export default UserStationPage;
