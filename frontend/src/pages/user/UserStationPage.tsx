import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import NavButton from "@/components/NavButton";
import SimpleButton from "@/components/SimpleButton";
import {
  createBooking,
  fetchStationById,
  fetchStationPorts,
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
      setError("Missing station id.");
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPorts = await fetchStationPorts(stationId);
      setPorts(nextPorts);
      return nextPorts;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load station ports");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadStation();
  }, [loadStation]);

  useEffect(() => {
    void loadPorts();
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
    </div>
  );
};

export default UserStationPage;
