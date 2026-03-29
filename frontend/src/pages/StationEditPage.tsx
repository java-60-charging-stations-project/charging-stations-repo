import { useCallback, useEffect, useState } from "react";
import { getLogger } from "@/services/logging";
import {
    createStation,
    fetchStationById as adminFetchStationById,
    changeStationState as adminChangeStationState,
    deleteStation,
} from "@/services/api/adminApi";
import {
    fetchStationById as supportFetchStationById,
    changeStationState as supportChangeStationState,
} from "@/services/api/supportApi";
import type { AdminCreateStationRequest, StationState } from "@/types/stations";
import { useForm, type SubmitHandler } from "react-hook-form";
import { config } from "@/config/env";
import NavButton from "@/components/NavButton";
import { StationStateBadge } from "@/components/StatusBadge";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const logger = getLogger('StationEditPage');

type StationFormData = Omit<AdminCreateStationRequest, 'code'>;

const LABEL = "w-1/3 shrink-0 pr-2 text-right";

const FieldRow = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="mb-1 flex items-center flex-wrap">
        <label className={LABEL}>{label}</label>
        <div className="flex-1">{children}</div>
        {error && <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">{error}</p>}
    </div>
);

interface StationStateActionsProps {
    stationId: string;
    stationState: StationState;
    updatedAt: string;
    userRole: string | null;
    maxPowerKw: number;
    peakRate: number;
    offPeakRate: number;
    onStateChanged: () => Promise<void>;
    onDeleted: () => void;
}

const StationStateActions: React.FC<StationStateActionsProps> = ({
    stationId, stationState, updatedAt, userRole,
    maxPowerKw, peakRate, offPeakRate,
    onStateChanged, onDeleted,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const changeStateFn = userRole === "ADMIN" ? adminChangeStationState : supportChangeStationState;

    const handleChangeState = async (newState: StationState) => {
        setError(null);
        setIsProcessing(true);
        try {
            await changeStateFn(stationId, { oldState: stationState, newState, updatedAt });
            await onStateChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Operation failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        setError(null);
        setIsProcessing(true);
        try {
            await deleteStation(stationId);
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleActivate = () => {
        const issues: string[] = [];
        if (!maxPowerKw || maxPowerKw <= 0) issues.push("Max power (kW) must be greater than 0");
        if (!peakRate || peakRate <= 0) issues.push("High rate must be greater than 0");
        if (!offPeakRate || offPeakRate <= 0) issues.push("Low rate must be greater than 0");
        if (issues.length > 0) {
            setError(issues.join(". "));
            return;
        }
        void handleChangeState("ACTIVE");
    };

    const renderActions = () => {
        if (userRole === "ADMIN" && stationState === "INACTIVE") {
            return (
                <>
                    <button type="button" className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("OUT_OF_SERVICE")}>
                        To support
                    </button>
                    <button type="button" className="px-2 py-1 rounded-md bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleDelete()}>
                        Delete
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && stationState === "OUT_OF_SERVICE") {
            return (
                <>
                    <button type="button" className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("INACTIVE")}>
                        To admin
                    </button>
                    <button type="button" className="px-2 py-1 rounded-md bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={handleActivate}>
                        Activate
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && stationState === "ACTIVE") {
            return (
                <button type="button" className="px-2 py-1 rounded-md bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("OUT_OF_SERVICE")}>
                    Deactivate
                </button>
            );
        }
        return null;
    };

    const actions = renderActions();

    return (
        <div className="mt-3 border-t border-neutral-200 pt-3 text-xs">
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">State:</span>
                <StationStateBadge state={stationState} />
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Actions:</span>
                    {actions}
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
    );
};

const StationEditPage = () => {
    const { stationId } = useParams<{ stationId: string }>();
    const isViewMode = !!stationId;
    const { pathname } = useLocation();
    const useSupportStationApi = pathname.startsWith("/support/stations");
    const { userRole } = useAuth();
    const [isSupportUser, setIsSupportUser] = useState(false);
    const [currentStationState, setCurrentStationState] = useState<StationState | null>(null);
    const [stationUpdatedAt, setStationUpdatedAt] = useState<string>("");
    const navigate = useNavigate();

    const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<StationFormData>();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const isLocked = isViewMode || isSubmitting || submitSuccess;
    const watchedMaxPowerKw = watch("maxPowerKw");

    const watchedPeakRate = watch("ratePlan.peakRate");
    const watchedOffPeakRate = watch("ratePlan.offPeakRate");

    useEffect(() => {
        setIsSupportUser(userRole === "SUPPORT");
    }, [userRole]);

    const loadStation = useCallback(async () => {
        if (!stationId) return;
        const fetchStationById = useSupportStationApi
            ? supportFetchStationById
            : adminFetchStationById;
        try {
            const station = await fetchStationById(stationId);
            setCurrentStationState(station.state);
            setStationUpdatedAt(station.updatedAt);
            reset({
                name: station.name,
                owner: station.owner,
                city: station.city,
                address: station.address,
                location: station.location as AdminCreateStationRequest['location'],
                maxPowerKw: station.maxPowerKw as number,
                ratePlan: station.ratePlan as AdminCreateStationRequest['ratePlan'],
                siteTechnician: station.siteTechnician,
                phone: station.phone,
                email: station.email,
            });
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : "Failed to load station");
        }
    }, [stationId, reset, useSupportStationApi]);

    useEffect(() => {
        void loadStation();
    }, [loadStation]);

    const onSubmit: SubmitHandler<StationFormData> = async (data) => {
        logger.debug('Form submitted', data);
        setSubmitError(null);
        try {
            const code = `${data.owner}=+=${data.city}=+=${data.address}`;
            const createPayload: AdminCreateStationRequest = {
                ...data,
                code,
                ratePlan: {
                    ...data.ratePlan,
                    currencyCode: config.currency.code,
                    currencyName: config.currency.name,
                },
            };
            logger.debug('Create station payload', createPayload);
            await createStation(createPayload);
            setSubmitSuccess(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setSubmitError(message);
        }
    };

    const ratesTitle = `Rates in ${config.currency.code}`;
    const backPath = isSupportUser ? "/support/stations" : "/admin/stations";

    return (
        <div className="max-w-md mx-auto mt-5 p-4 text-[9px] leading-tight rounded-lg shadow-md flex flex-col space-y-3">
            <div>
                <NavButton to={backPath} caption="← Back to stations" />
            </div>
            <h1 className="text-center">{isViewMode ? "Station details" : "Create a new station"}</h1>
            {loadError && <p className="text-red-500 text-xs">{loadError}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs">
                <FieldRow label="City" error={errors.city?.message}>
                    <input className="w-full" disabled={isLocked} {...register("city", { required: "City is required" })} />
                </FieldRow>
                <FieldRow label="Address" error={errors.address?.message}>
                    <input className="w-full" disabled={isLocked} {...register("address", { required: "Address is required" })} />
                </FieldRow>
                <div className="mb-1 flex items-center flex-wrap ">
                    <label className={LABEL}>Coordinates</label>
                    <div className="flex-1 flex gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                            <span className="block text-[9px] mb-0.5 text-neutral-600">Lat.</span>
                            <input
                                type="number"
                                step="any"
                                className="w-full"
                                disabled={isLocked}
                                {...register("location.latitude", {
                                    valueAsNumber: true,
                                    required: "Latitude is required",
                                })}
                            />
                            {errors.location?.latitude?.message && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.location.latitude.message}</p>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="block text-[9px] mb-0.5 text-neutral-600">Lon.</span>
                            <input
                                type="number"
                                step="any"
                                className="w-full"
                                disabled={isLocked}
                                {...register("location.longitude", {
                                    valueAsNumber: true,
                                    required: "Longitude is required",
                                })}
                            />
                            {errors.location?.longitude?.message && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.location.longitude.message}</p>
                            )}
                        </div>
                    </div>
                </div>
                <FieldRow label="Station Name" error={errors.name?.message}>
                    <input className="w-full" disabled={isLocked} {...register("name", { required: "Station name is required" })} />
                </FieldRow>
                <FieldRow label="Owner" error={errors.owner?.message}>
                    <input className="w-full" disabled={isLocked} {...register("owner", { required: "Owner is required" })} />
                </FieldRow>
                <div className="mb-1 flex items-center flex-wrap">
                    <label className={LABEL}>{ratesTitle}</label>
                    <div className="flex-1 flex gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                            <span className="block text-[9px] mb-0.5 text-neutral-600">High</span>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-full"
                                disabled={isLocked}
                                {...register("ratePlan.peakRate", { valueAsNumber: true, required: "High rate is required" })}
                            />
                            {errors.ratePlan?.peakRate?.message && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.ratePlan.peakRate.message}</p>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="block text-[9px] mb-0.5 text-neutral-600">Low</span>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-full"
                                disabled={isLocked}
                                {...register("ratePlan.offPeakRate", { valueAsNumber: true, required: "Low rate is required" })}
                            />
                            {errors.ratePlan?.offPeakRate?.message && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.ratePlan.offPeakRate.message}</p>
                            )}
                        </div>
                    </div>
                </div>
                <FieldRow label="Max (kW)" error={errors.maxPowerKw?.message}>
                    <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-full"
                        disabled={isLocked}
                        {...register("maxPowerKw", {
                            valueAsNumber: true,
                            required: "Max power is required",
                            min: { value: 0, message: "Max power must be non-negative" },
                        })}
                    />
                </FieldRow>
                <FieldRow label="Technician Name">
                    <input className="w-full" disabled={isLocked} {...register("siteTechnician")} />
                </FieldRow>
                <FieldRow label="Technician Phone" error={errors.phone?.message}>
                    <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full"
                        disabled={isLocked}
                        {...register("phone", {
                            pattern: {
                                value: /^0[0-9]{9}$/,
                                message: "Phone must start with 0 and contain exactly 10 digits",
                            },
                        })}
                    />
                </FieldRow>
                <FieldRow label="Technician Email">
                    <input className="w-full" disabled={isLocked} {...register("email")} />
                </FieldRow>

                {!isViewMode && (
                    <>
                        <input
                            type="submit"
                            className="mt-1 bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLocked}
                            value={isSubmitting ? "Submitting..." : "Submit"}
                        />
                        {submitError && <p className="text-red-500 text-xs mt-2">{submitError}</p>}
                        {submitSuccess && <p className="text-green-500 text-xs mt-2">Station created successfully!</p>}
                    </>
                )}
            </form>
            {isViewMode && currentStationState && (
                <StationStateActions
                    stationId={stationId!}
                    stationState={currentStationState}
                    updatedAt={stationUpdatedAt}
                    userRole={userRole}
                    maxPowerKw={watchedMaxPowerKw}
                    peakRate={watchedPeakRate}
                    offPeakRate={watchedOffPeakRate}
                    onStateChanged={loadStation}
                    onDeleted={() => navigate(backPath)}
                />
            )}
        </div>
    );
};

export default StationEditPage;
