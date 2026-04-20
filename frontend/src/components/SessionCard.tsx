import type { Session, UserSessionPaymentRequest, UserSessionPortUpdateRequest } from "@/types/sessions";
import EasySpinner from "@/components/EasySpinner";
import { isFreshUnpaidSession } from "@/utils/sessionStatus";
import {
  useCancelBookingMutation,
  useStartChargingMutation,
  useStopChargingMutation,
  usePayManuallyMutation,
} from "@/store/apiSlice";
import { getLogger } from "@/services/logging";
import { config } from "@/config/env";

const logger = getLogger("UserSession");

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatNumeric(value?: number | string | null, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

function ActionButton({
  label,
  onClick,
  isLoading,
  variant,
}: {
  label: string;
  onClick: () => void;
  isLoading: boolean;
  variant: "danger" | "primary";
}) {
  const base = "rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50";
  const colors =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      type="button"
      className={`${base} ${colors}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? "Processing…" : label}
    </button>
  );
};

function DateFormatted(label: string, value?: string | null) {
  return (
      <p>
        <span className="font-medium">{label}:</span>{" "}
        {formatDate(value)}
      </p>
  );
};

function NumberFormatted(label: string, value?: number | string | null, suffix = "") {
  return (
      <p>
        <span className="font-medium">{label}:</span>{" "}
        {formatNumeric(value, suffix)}
      </p>
  );
};

export default function SessionCard({ session }: { session: Session }) {
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [startCharging, { isLoading: isStarting }] = useStartChargingMutation();
  const [stopCharging, { isLoading: isStopping }] = useStopChargingMutation();
  const [payManuallyMutation, {
    isLoading: isPaying,
    isError: isPayError,
    error: payError }] = usePayManuallyMutation();
  
  const req: UserSessionPortUpdateRequest = {
    stationId: session.stationId,
    portCode: session.portCode,
    oldState: session.state === "BOOKED" ? "BOOKED" : "OCCUPIED",
  };

  const isBooked = session.state === "BOOKED";
  const isActive = session.state === "ACTIVE";
  const isUnpaid = session.state === "UNPAID";
  const isPaid = session.state === "PAID";
  const isFreshUnpaid = isFreshUnpaidSession(session);
  const usesActiveColors = isActive || isFreshUnpaid;
  const showAsPaying = isPaying || isFreshUnpaid;
  const displayState = showAsPaying ? "PROCESS PAYMENT" : session.state;

  const stateColors = isBooked
    ? "border-blue-300 bg-blue-50"
    : usesActiveColors
      ? "border-green-300 bg-green-50"
      : "border-amber-300 bg-amber-50";

  const badgeColors = isBooked
    ? "bg-blue-100 text-blue-800 border-blue-300"
    : usesActiveColors
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-amber-100 text-amber-800 border-amber-300";
  
  const payManually = async () => {
    const payRequest: UserSessionPaymentRequest = {
      stationId: session.stationId,
      entityKey: session.entityKey,
    };
    try {
      logger.debug(".payManually sending pay request: ", payRequest);
      const response = await payManuallyMutation(payRequest).unwrap();
      logger.debug(".payManually Payment successful, response: ", response);
    }
    catch (err) {
      console.error(".payManually Error while paying: ", err);
    }
  }

  return (
    <article className={`rounded-lg border p-4 shadow-sm ${stateColors}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            Station: {session.entityKey}
          </p>
          <p className="text-sm text-slate-600">Port: {session.portCode}</p>
        </div>
        <span
          className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${badgeColors}`}
        >
          {displayState}
        </span>
      </div>
      
      {isBooked && (
        <div className="mb-3 space-y-1 text-sm text-slate-700">
          {DateFormatted("Started at", session.startedAt)}
          {DateFormatted("Booked at", session.timeBookedAt)}
          {DateFormatted("Booked until", session.timeBookedBefore)}
          {NumberFormatted("Tariff", session.tariff, ` ${config.currency.code}`)}
          {NumberFormatted("Current Cost", session.currentCost, ` ${config.currency.code}`)}
          {NumberFormatted("Duration", session.durationMinutes, " min")}
        </div>
      )}

      {isActive && (
        <div className="mb-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          {DateFormatted("Started at", session.startedAt)}
          {DateFormatted("Stopped at", session.stoppedAt)}
          {NumberFormatted("Tariff", session.tariff, ` ${config.currency.code}`)}
          {NumberFormatted("Current Cost", session.currentCost, ` ${config.currency.code}`)}
          {NumberFormatted("Energy consumed", session.energyConsumedKwh, " kWh")}
          {NumberFormatted("Charge", session.chargeLevelPercent, "%")}
          {NumberFormatted("Duration", session.durationMinutes, " min")}
          {NumberFormatted("Time until 100%", session.estimatedMinutesRemaining, " min")}
          
        </div>
      )}

      {isUnpaid && (
        <>
          <div className="mb-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            {DateFormatted("Started at", session.startedAt)}
            {DateFormatted("Booked at", session.timeBookedAt)}
            {DateFormatted("Stopped at", session.stoppedAt)}
            {DateFormatted("Ended at", session.endedAt)}
            {NumberFormatted("Tariff", session.tariff, ` ${config.currency.code}`)}
            {NumberFormatted("Total Cost", session.currentCost, ` ${config.currency.code}`)}
            {NumberFormatted("Energy consumed", session.energyConsumedKwh, " kWh")}
            {NumberFormatted("Final charge", session.chargeLevelPercent, "%")}
            {NumberFormatted("Total duration", session.durationMinutes, " min")}
            {isPayError && (
              <p>
                <span className="font-medium">Payment error:</span>{" "}
                {payError?.message}
              </p>
            )}
          </div>
        </>
      )}
      {
        isPaid && (
          <div className="mb-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            {DateFormatted("Started at", session.startedAt)}
            {DateFormatted("Booked at", session.timeBookedAt)}
            {DateFormatted("Stopped at", session.stoppedAt)}
            {DateFormatted("Ended at", session.endedAt)}
            {NumberFormatted("Tariff", session.tariff, ` ${config.currency.code}`)}
            {NumberFormatted("Total Cost", session.currentCost, ` ${config.currency.code}`)}
            {NumberFormatted("Energy consumed", session.energyConsumedKwh, " kWh")}
            {NumberFormatted("Final charge", session.chargeLevelPercent, "%")}
            {NumberFormatted("Total duration", session.durationMinutes, " min")}
          </div>
        )
      }

      <div className="flex gap-2">
        {isBooked && (
          <>
            <ActionButton
              label="Stop booking"
              variant="danger"
              isLoading={isCancelling}
              onClick={() => cancelBooking(req)}
            />
            <ActionButton
              label="Start charging"
              variant="primary"
              isLoading={isStarting}
              onClick={() => startCharging(req)}
            />
          </>
        )}

        {isActive && (
            <ActionButton
              label="Stop charging"
              variant="danger"
              isLoading={isStopping}
              onClick={() => stopCharging(req)}
            />
          )
        }
        
        {
          showAsPaying? (
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700">
              <EasySpinner size="sm" />
              <span>Payment is being processed</span>
            </div>
          ) : isUnpaid && (
            <ActionButton
              label="Process payment"
              variant="danger"
              isLoading={isStopping}
                onClick={payManually}
            />
          )
        }
      </div>
    </article>
  );
}
