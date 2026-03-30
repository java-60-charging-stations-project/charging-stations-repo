import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import NavButton from "@/components/NavButton";
import Modal from "@/components/Modal";
import SimpleButton from "@/components/SimpleButton";
import {
  createBooking,
  fetchStationById,
  fetchStationPorts,
  startChargingSession,
} from "@/services/api/userApi";
import type { StationBase, StationPort } from "@/types/stations";

const UserStationPage = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const [station, setStation] = useState<StationBase | null>(null);
  const [ports, setPorts] = useState<StationPort[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isPreparingCharging, setIsPreparingCharging] = useState<boolean>(false);
  const [isStartingCharging, setIsStartingCharging] = useState<boolean>(false);
  const [chargingMessage, setChargingMessage] = useState<string | null>(null);
  const [chargingError, setChargingError] = useState<string | null>(null);
  const [chargeModalOpen, setChargeModalOpen] = useState<boolean>(false);
  const [availableFreePorts, setAvailableFreePorts] = useState<StationPort[]>([]);
  const [selectedPortCode, setSelectedPortCode] = useState<string>("");

  const loadStation = useCallback(async () => {
    if (!stationId) {
      setStation(null);
      return;
    }

    try {
      const nextStation = await fetchStationById(stationId);
      setStation(nextStation);
    } catch {
      setStation(null);
    }
  }, [stationId]);

  const loadPorts = useCallback(async (): Promise<StationPort[]> => {
    if (!stationId) {
      const missingStationError = "Missing station id.";
      setError(missingStationError);
      setIsLoading(false);
      throw new Error(missingStationError);
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPorts = await fetchStationPorts(stationId);
      setPorts(nextPorts);
      return nextPorts;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load station ports";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadStation();
  }, [loadStation]);

  useEffect(() => {
    void loadPorts().catch(() => undefined);
  }, [loadPorts]);

  const freePortsCount = useMemo(
    () => ports.filter((port) => port.status === "FREE").length,
    [ports],
  );

  const handleBook = useCallback(async () => {
    if (!stationId) {
      setBookingError("Missing station id.");
      setBookingMessage(null);
      return;
    }

    setIsBooking(true);
    setBookingMessage(null);
    setBookingError(null);

    try {
      const latestPorts = await loadPorts();
      const freePort = latestPorts.find((port) => port.status === "FREE");

      if (!freePort) {
        setBookingError("No free ports available right now.");
        return;
      }

      const response = await createBooking({
        stationId,
        portCode: freePort.portCode,
        oldState: "FREE",
      });

      setBookingMessage(
        `You have successfully booked port N ${response.portCode}.`,
      );
      await loadPorts();
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to book a port",
      );
    } finally {
      setIsBooking(false);
    }
  }, [loadPorts, stationId]);

  const handleInitiateCharging = useCallback(async () => {
    setIsPreparingCharging(true);
    setChargingMessage(null);
    setChargingError(null);
    setSelectedPortCode("");

    try {
      const latestPorts = await loadPorts();
      const freePorts = latestPorts.filter((port) => port.status === "FREE");

      if (freePorts.length === 0) {
        setAvailableFreePorts([]);
        setChargingError("There is no free ports right now");
        return;
      }

      setAvailableFreePorts(freePorts);
      setChargeModalOpen(true);
    } catch (err) {
      setAvailableFreePorts([]);
      setChargingError(
        err instanceof Error ? err.message : "Failed to load station ports",
      );
    } finally {
      setIsPreparingCharging(false);
    }
  }, [loadPorts]);

  const handleCharge = useCallback(async () => {
    if (!stationId || !selectedPortCode) {
      return;
    }

    setChargeModalOpen(false);
    setIsStartingCharging(true);
    setChargingMessage(null);
    setChargingError(null);

    try {
      await startChargingSession({
        stationId,
        portCode: selectedPortCode,
        oldState: "FREE",
      });
      setChargingMessage("Your charging session is started");
      await loadPorts();
    } catch (err) {
      setChargingError(
        err instanceof Error ? err.message : "Failed to start charging session",
      );
    } finally {
      setIsStartingCharging(false);
    }
  }, [loadPorts, selectedPortCode, stationId]);

  return (
    <div className="mx-auto mt-5 max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <NavButton to="/user/stations" caption="← Back to stations" />
      </div>

      <div className="space-y-1">
        <h1 className="text-center text-2xl font-bold">
          {station?.name ?? "Station"}
        </h1>
        <p className="text-center text-sm text-slate-500">
          City: {station?.city ?? "Unknown city"}
        </p>
        <p className="text-center text-sm text-slate-500">
          Address: {station?.address ?? "Unknown address"}
        </p>
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

      <section className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Book a port now:</h2>

        {bookingMessage && (
          <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            {bookingMessage}
          </p>
        )}

        {bookingError && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {bookingError}
          </p>
        )}

        <div className="flex justify-center">
          <SimpleButton
            caption="Book"
            loadingCaption="Booking..."
            handleClick={() => void handleBook()}
            isLoading={isBooking}
            isDisabled={!stationId || isLoading}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">On the station right now?</h2>

        {chargingMessage && (
          <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            {chargingMessage}
          </p>
        )}

        {chargingError && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {chargingError}
          </p>
        )}

        <div className="flex justify-center">
          <SimpleButton
            caption="Initiate charging"
            loadingCaption="Preparing..."
            handleClick={() => void handleInitiateCharging()}
            isLoading={isPreparingCharging}
            isDisabled={!stationId || isLoading || isStartingCharging}
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
            <option value="">--Chose your port--</option>
            {availableFreePorts.map((port) => (
              <option key={port.portId} value={port.portCode}>
                {port.portCode}
              </option>
            ))}
          </select>

          <div className="flex justify-end">
            <SimpleButton
              caption="Charge"
              loadingCaption="Charging..."
              handleClick={() => void handleCharge()}
              isLoading={isStartingCharging}
              isDisabled={!selectedPortCode}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserStationPage;
