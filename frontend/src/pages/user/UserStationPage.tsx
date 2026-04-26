import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useGetSessionsQuery,
  useGetUserStationPortsQuery,
  useGetUserStationQuery,
  useStartBookingMutation,
  useStartChargingMutation,
} from "@/store/apiSlice";
import type { StationPort } from "@/types/stations";
import EasySpinner from "@/components/EasySpinner";
import EasyButton from "@/components/EasyButton";
import { config } from "@/config/env";
import { getLogger } from "@/services/logging";
import { toast } from "react-toastify";

function getEncodedPath(location: Location): string {
    return encodeURIComponent(location.pathname + location.search);
}

const logger = getLogger("User.Station");
const TOAST_AUTO_CLOSE = 3000;

const pollingInterval = config.userSessionsPollingInterval;

type PortCardProps = {
  port: StationPort;
  onStartCharging: (portCode: string) => void;
  isCharging: boolean;
  isDisabled: boolean;
  maxWidthClassName?: string;
};

const statusBadgeClassName: Record<StationPort["status"], string> = {
  FREE: "border border-emerald-300 bg-emerald-50 text-emerald-700",
  BOOKED: "border border-amber-300 bg-amber-50 text-amber-700",
  OCCUPIED: "border border-blue-300 bg-blue-50 text-blue-700",
  DISABLED: "border border-slate-300 bg-slate-100 text-slate-700",
  ERROR: "border border-rose-300 bg-rose-50 text-rose-700",
};

const PortCard = ({
  port,
  onStartCharging,
  isCharging,
  isDisabled,
  maxWidthClassName = "max-w-sm",
}: PortCardProps) => {
  const isFree = port.status === "FREE";

  return (
    <article
      className={`w-full ${maxWidthClassName} rounded-md border border-slate-200 bg-white p-4 shadow-sm`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClassName[port.status]}`}
        >
          {port.status}
        </span>
        <span className="text-base font-bold text-slate-900">{port.portCode}</span>
      </div>

      <EasyButton
        onClick={() => onStartCharging(port.portCode)}
        disabled={!isFree || isDisabled}
        className="w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCharging ? (
          <span className="inline-flex items-center gap-2">
            <EasySpinner size="sm" />
            Charging...
          </span>
        ) : (
          "Charging"
        )}
      </EasyButton>
    </article>
  );
};

const UserStationPage = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [chargingPortCode, setChargingPortCode] = useState<string | null>(null);
  const [isRequestAccepted, setIsRequestAccepted] = useState<boolean>(false);

  const navigateToSessions = () => {
    navigate(`/user/session?from=${getEncodedPath(location)}`);
  }
  
  const { data: sessionsData } = useGetSessionsQuery(undefined, {
    pollingInterval,
    skipPollingIfUnfocused: false,
    refetchOnReconnect: true,
  });
  const { data: station } = useGetUserStationQuery(stationId!, {
    skip: !stationId,
  });
  const { data: ports, refetch: refetchPorts, isLoading: isLoadingPorts } = useGetUserStationPortsQuery(stationId!, {
    skip: !stationId,
    pollingInterval,
    skipPollingIfUnfocused: true,
    refetchOnReconnect: true,
  });

  const [startBooking, { isLoading: isBooking }] = useStartBookingMutation();
  const [startCharging, { isLoading: isCharging }] = useStartChargingMutation();

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
  
  const handleBook = async () => {
    if ( !stationId || hasExistingSession ) return;
    let isPortsUpdated = false;
    let freePort: StationPort | undefined = undefined;
    try {
      if (!ports) {
        await refetchPorts().unwrap();
        isPortsUpdated = true;
      }
      
      freePort = ports?.find((p) => p.status === "FREE");
      // Second attempt to get free port if first attempt failed
      if (!freePort && !isPortsUpdated) {
        await refetchPorts().unwrap();
        isPortsUpdated = true;
        freePort = ports?.find((p) => p.status === "FREE");
      }
    } catch (error) {
      logger.error("Failed to load ports", error);
      toast.error(
        "Error while loading ports. Try again",
        {
          position: "bottom-right",
          toastId: "ports-error",
        },
      );
      return;
    }
    if (!freePort) {
      toast.error(
        "Sorry. No free ports available right now.",
        {
          position: "bottom-right",
          toastId: "no-free-ports",
        },
      );
      return;
    }

    try {
      const serverResponse = await startBooking({
        stationId,
        portCode: freePort.portCode,
        oldState: "FREE",
      }).unwrap();

      setIsRequestAccepted(true); // Helpful for async requests
      const bookMessage = (serverResponse.type === "sync")
        ? `The port ${freePort.portCode} is booked`
        : `Request to book port ${freePort.portCode} accepted`;
      toast.success(
        <div className="flex items-center gap-2">
          <EasySpinner size="sm" />
          <span>{ bookMessage }. Redirecting...</span>
        </div>,
        {
          autoClose: TOAST_AUTO_CLOSE,
          position: "bottom-right",
          toastId: "booking-success",
        },
      );
      window.setTimeout(() => {
        navigateToSessions();
      }, TOAST_AUTO_CLOSE);
    } catch {
      toast.error(
        "Error while booking the port. Try again. If the problem persists, contact support.",
        {
          position: "bottom-right",
          toastId: "booking-error",
        },
      );
      logger.error("Failed to start booking");
    }
  };

  const handleStartCharging = async (portCode: string) => {
    if (!stationId || hasExistingSession) return;
    
    try {
      setChargingPortCode(portCode);
      const serverResponse = await startCharging({
        stationId,
        portCode: portCode,
        oldState: "FREE",
      }).unwrap();
      setIsRequestAccepted(true); // Helpful for async requests
      const chargeMessage = (serverResponse.type === "sync")
        ? `Charging started at the port ${portCode}`
        : `Request to start charging at the ${portCode} accepted`;
      toast.success(
        <div className="flex items-center gap-2">
          <EasySpinner size="sm" />
          <span>{ chargeMessage }. Redirecting...</span>
        </div>,
        {
          autoClose: TOAST_AUTO_CLOSE,
          position: "bottom-right",
          toastId: "charging-success",
        },
      );
      window.setTimeout(() => {
        navigateToSessions();
      }, TOAST_AUTO_CLOSE);
    } catch {
      toast.error(
        "Error while starting charging. Try again. If the problem persists, contact support.",
        {
          position: "bottom-right",
          toastId: "charging-error",
        },
      );
      logger.error("Failed to start charging");
    } finally {
      setChargingPortCode(null);
    }
  };

  const stationAddress = useMemo(() => {
    return station?.city ? (station.city + ", " + station.address) : station?.address ?? "-";
  }, [station]);

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
        {stationAddress}
      </p>

      {hasExistingSession && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            You already have the {existingSessionLabel} session.
          </p>
          <Link
            to={`/user/session?from=${getEncodedPath(location)}`}
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Go to sessions &rarr;
          </Link>
        </section>
      )}

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-center text-slate-900">
            On your way to this station? Book a free port for 15 minutes:
          </h2>
          <div className="flex justify-center mx-auto">
            <EasyButton
              onClick={() => void handleBook()}
              disabled={hasExistingSession || !stationId || isLoadingPorts || isBooking}
              className="min-w-28 max-w-32 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBooking ? (
                <span className="inline-flex items-center gap-2">
                  <EasySpinner size="sm" />
                  Booking...
                </span>
              ) : (
                "Book"
              )}
            </EasyButton>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 text-center">
          At the station right now? Choose your port:
        </h2>

        {isLoadingPorts ? (
          <div className="flex justify-center py-4">
            <EasySpinner />
            Loading ports...
          </div>
        ) : ports && ports.length > 0 ? (
          <div className="grid grid-cols-1 justify-items-center gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ports.map((port) => (
              <PortCard
                key={port.portId}
                port={port}
                onStartCharging={handleStartCharging}
                isCharging={isCharging && chargingPortCode === port.portCode}
                isDisabled={hasExistingSession || isCharging || isRequestAccepted}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No ports found for this station.</p>
        )}
      </section>

    </div>
  );
};

export default UserStationPage;
