import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useGetSessionsQuery,
  useStartBookingMutation,
  useStartChargingMutation,
} from "@/store/apiSlice";
import { fetchStationById, fetchStationPorts } from "@/services/api/userApi";
import type { StationBase, StationPort } from "@/types/stations";
import EasySpinner from "@/components/EasySpinner";
import Modal from "@/components/Modal";
import SimpleButton from "@/components/SimpleButton";
import { config } from "@/config/env";

const pollingInterval = config.userSessionsPollingInterval;

const UserStationPage = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();

  const [station, setStation] = useState<StationBase | null>(null);
  const [ports, setPorts] = useState<StationPort[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(true);
  const [portsError, setPortsError] = useState<string | null>(null);

  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedPortCode, setSelectedPortCode] = useState("");

  const { data: sessionsData } = useGetSessionsQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: true,
    refetchOnReconnect: true,
  });

  const [startBooking, { isLoading: isBooking, error: bookingError }] =
    useStartBookingMutation();
  const [startCharging, { isLoading: isCharging, error: chargingError }] =
    useStartChargingMutation();

  const existingSessionLabel = useMemo(() => {
    const s = sessionsData?.sessions.find(
      (s) =>
        s.state === "BOOKED" || s.state === "ACTIVE" || s.state === "UNPAID",
    );
    if (!s) return null;
    const labels: Record<string, string> = {
      BOOKED: "booked",
      ACTIVE: "active",
      UNPAID: "unpaid",
    };
    return labels[s.state] ?? s.state.toLowerCase();
  }, [sessionsData]);

  const hasExistingSession = existingSessionLabel !== null;

  const freePorts = useMemo(
    () => ports.filter((p) => p.status === "FREE"),
    [ports],
  );

  useEffect(() => {
    if (!stationId) return;
    void fetchStationById(stationId)
      .then(setStation)
      .catch(() => setStation(null));
  }, [stationId]);

  const loadPorts = useCallback(async () => {
    if (!stationId) {
      setPortsError("Missing station id.");
      setIsLoadingPorts(false);
      return [];
    }
    setIsLoadingPorts(true);
    setPortsError(null);
    try {
      const nextPorts = await fetchStationPorts(stationId);
      setPorts(nextPorts);
      return nextPorts;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load station ports";
      setPortsError(msg);
      return [];
    } finally {
      setIsLoadingPorts(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadPorts();
  }, [loadPorts]);

  const handleBook = async () => {
    if (!stationId || hasExistingSession) return;

    const latestPorts = await loadPorts();
    const freePort = latestPorts.find((p) => p.status === "FREE");
    if (!freePort) {
      setPortsError("No free ports available right now.");
      return;
    }

    try {
      await startBooking({
        stationId,
        portCode: freePort.portCode,
        oldState: "FREE",
      }).unwrap();
      navigate("/user/session");
    } catch {
      /* error exposed via bookingError */
    }
  };

  const handleInitiateCharging = async () => {
    if (!stationId || hasExistingSession) return;
    setSelectedPortCode("");

    const latestPorts = await loadPorts();
    const free = latestPorts.filter((p) => p.status === "FREE");
    if (free.length === 0) {
      setPortsError("No free ports available right now.");
      return;
    }
    setChargeModalOpen(true);
  };

  const handleStartCharging = async () => {
    if (!stationId || !selectedPortCode || hasExistingSession) return;
    setChargeModalOpen(false);

    try {
      await startCharging({
        stationId,
        portCode: selectedPortCode,
        oldState: "FREE",
      }).unwrap();
      navigate("/user/session");
    } catch {
      /* error exposed via chargingError */
    }
  };

  const mutationErrorMsg =
    (bookingError as { message?: string } | undefined)?.message ??
    (chargingError as { message?: string } | undefined)?.message ??
    null;

  return (
    <div className="space-y-6">
      <Link
        to="/user/stations"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Back to stations
      </Link>

      <h1 className="text-center text-2xl font-bold">
        {station?.name ?? "Station"}
      </h1>
      <p className="text-center text-sm text-slate-500">
        {station?.city ?? "Unknown city"},{" "}
        {station?.address ?? "Unknown address"}
      </p>

      {hasExistingSession && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            You already have the {existingSessionLabel} session.
          </p>
          <Link
            to="/user/session"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Go to sessions &rarr;
          </Link>
        </section>
      )}

      {portsError && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {portsError}
        </p>
      )}

      {mutationErrorMsg && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {mutationErrorMsg}
        </p>
      )}

      {isLoadingPorts ? (
        <EasySpinner />
      ) : (
        !portsError && (
          <p className="text-center text-sm text-slate-700">
            The station has {freePorts.length} free (of {ports.length}) ports
            right now.
          </p>
        )
      )}

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          onClick={() => void loadPorts()}
          disabled={isLoadingPorts}
        >
          Refetch
        </button>
      </div>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Book a port now
        </h2>

        <div className="flex justify-center">
          <SimpleButton
            caption="Book"
            loadingCaption="Booking..."
            handleClick={() => void handleBook()}
            isLoading={isBooking}
            isDisabled={
              hasExistingSession || !stationId || isLoadingPorts
            }
          />
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          On the station right now?
        </h2>

        <div className="flex justify-center">
          <SimpleButton
            caption="Initiate charging"
            loadingCaption="Preparing..."
            handleClick={() => void handleInitiateCharging()}
            isLoading={isCharging}
            isDisabled={
              hasExistingSession || !stationId || isLoadingPorts
            }
          />
        </div>
      </section>

      <Modal
        isOpen={chargeModalOpen}
        onClose={() => setChargeModalOpen(false)}
        showCloseButton={true}
        title="Start charging"
      >
        <div className="mt-4 space-y-4">
          <select
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={selectedPortCode}
            onChange={(e) => setSelectedPortCode(e.target.value)}
          >
            <option value="">-- Choose your port --</option>
            {freePorts.map((port) => (
              <option key={port.portId} value={port.portCode}>
                {port.portCode}
              </option>
            ))}
          </select>

          <div className="flex justify-end">
            <SimpleButton
              caption="Charge"
              loadingCaption="Starting..."
              handleClick={() => void handleStartCharging()}
              isLoading={isCharging}
              isDisabled={!selectedPortCode}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserStationPage;
