import { type FC } from "react";
import { useCallback, useEffect, useState, } from "react";
import { getLogger } from "@/services/logging";
import { createStation, updateStation } from "@/services/api/adminApi";
import { updateStation as supportUpdateStation } from "@/services/api/supportApi";
import type { AdminCreateStationRequest, AdminUpdateStationRequest, StationBase, StationState } from "@/types/stations";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { config } from "@/config/env";
import StationStateActions from "@/components/stations/StationStateActions";
import EasyButton from "@/components/EasyButton";
import { useNavigate } from "react-router";
import useFromParam from "@/hooks/useFromParam";

const logger = getLogger("StationEditForm");

function canEditStation(userRole: string, stationState: StationState): boolean {
    return (userRole === "ADMIN" && stationState === "INACTIVE") ||
        (userRole === "SUPPORT" && stationState === "OUT_OF_SERVICE");
};

type StationFormData = Omit<AdminCreateStationRequest, 'code'>;

const LABEL = "w-1/3 shrink-0 pr-2 text-right";

const FieldRow = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="mb-1 flex items-center flex-wrap">
        <label className={LABEL}>{label}</label>
        <div className="flex-1">{children}</div>
        {error && <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">{error}</p>}
    </div>
);

type StationEditFormProps = {
    userRole: string;
    stationId: string | undefined;
    fetchStationMethod: (stationId: string) => Promise<StationBase>;
};

const StationEditForm: FC<StationEditFormProps> = ({
    userRole = "USER",
    stationId,
    fetchStationMethod,
}) => {
    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<StationFormData>();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const isSupportUser = userRole === "SUPPORT";
    const [station, setStation] = useState<StationBase | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const navigate = useNavigate();
    const from = useFromParam();
    // Watched values
    const watchedMaxPowerKw = useWatch({ control, name: "maxPowerKw" });
    const watchedPeakRate = useWatch({ control, name: "ratePlan.peakRate" });
    const watchedOffPeakRate = useWatch({control, name: "ratePlan.offPeakRate"});

    const isEditing = stationId !== undefined;
    const isLocked = !isEditing && (isSubmitting || createSuccess);
    const isEditableFieldLocked = isLocked || (isEditing && (!canEdit || isSubmitting));

    const fromPath = from ? encodeURIComponent(from) : "";    

    const loadStation = useCallback(async () => {
        if (!stationId) {
            return;
        }
        try {
            const loadedStation = await fetchStationMethod(stationId);
            setStation(loadedStation);
            setCanEdit(canEditStation(userRole, loadedStation.state));
            reset({
                name: loadedStation.name,
                owner: loadedStation.owner,
                city: loadedStation.city,
                address: loadedStation.address,
                location: loadedStation.location as AdminCreateStationRequest['location'],
                maxPowerKw: loadedStation.maxPowerKw as number,
                ratePlan: loadedStation.ratePlan as AdminCreateStationRequest['ratePlan'],
                siteTechnician: loadedStation.siteTechnician,
                phone: loadedStation.phone,
                email: loadedStation.email,
            });
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : "Failed to load station");
        }
    }, [stationId, userRole, fetchStationMethod, reset]);

    useEffect(() => {
        void loadStation();
    }, [loadStation]);

    const onSubmit: SubmitHandler<StationFormData> = async (data) => {
        logger.debug('Form submitted', data);
        setSubmitError(null);
        try {
            if (stationId && canEdit) {
                const updatePayload: AdminUpdateStationRequest = {
                    address: data.address,
                    ratePlan: {
                        ...data.ratePlan,
                        currencyCode: config.currency.code,
                        currencyName: config.currency.name,
                    },
                    email: data.email || null,
                    phone: data.phone || null,
                    siteTechnician: data.siteTechnician || null,
                    maxPowerKw: data.maxPowerKw,
                    location: data.location,
                };
                logger.debug('Update station payload', updatePayload);
                if (isSupportUser) {
                    logger.debug('Support user updating station...');
                    await supportUpdateStation(stationId, updatePayload);
                }
                else {
                    logger.debug('Admin user updating station...');
                    await updateStation(stationId, updatePayload);
                }
                logger.debug('Station updated successfully');
                await loadStation();
                logger.debug('Station loaded successfully');
                return;
            }
            else {
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
                setCreateSuccess(true);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setSubmitError(message);
        }
    };

    const ratesTitle = `Rates in ${config.currency.code}`;
    return (
        <>
            <h1 className="text-center">{stationId ? "Station details" : "Create a new station"}</h1>
            {loadError && <p className="text-red-500 text-xs">{loadError}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs">
                <FieldRow label="City" error={errors.city?.message}>
                    <input className="w-full" disabled={isLocked || isEditing} {...register("city", { required: "City is required" })} />
                </FieldRow>
                <FieldRow label="Address" error={errors.address?.message}>
                    <input className="w-full" disabled={isLocked || isEditing} {...register("address", { required: "Address is required" })} />
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
                                disabled={isLocked || isEditing}
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
                                disabled={isLocked || isEditing}
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
                    <input className="w-full" disabled={isLocked || isEditing} {...register("owner", { required: "Owner is required" })} />
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
                                disabled={isEditableFieldLocked}
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
                                disabled={isEditableFieldLocked}
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
                        step="1"
                        min={1}
                        className="w-full"
                        disabled={isEditableFieldLocked}
                        {...register("maxPowerKw", {
                            valueAsNumber: true,
                            required: "Max power is required",
                            min: { value: 1, message: "Max power must be positive" },
                        })}
                    />
                </FieldRow>
                <FieldRow label="Technician Name">
                    <input
                    className="w-full"
                    {...register("siteTechnician")}
                    disabled={isEditableFieldLocked} />
                </FieldRow>
                <FieldRow label="Technician Phone" error={errors.phone?.message}>
                    <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full"
                        {...register("phone", {
                            pattern: {
                                value: /^0[0-9]{9}$/,
                                message: "Phone must start with 0 and contain exactly 10 digits",
                            },
                        })}
                        disabled={isEditableFieldLocked}
                    />
                </FieldRow>
                <FieldRow label="Technician Email">
                    <input className="w-full" disabled={isEditableFieldLocked} {...register("email")} />
                </FieldRow>
                {
                    stationId && (
                        <FieldRow label="Ports">
                            {isSupportUser ? (
                                <div className="w-full flex">
                                    <EasyButton
                                        onClick={() => {
                                            navigate(`/support/stations/view/${stationId}/ports?from=${fromPath}`);
                                        }}
                                        pH={7}
                                    >
                                        Manage ports
                                    </EasyButton>
                                </div>
                            ): (
                                <input className="w-full" disabled={true} value={station?.portsCount ?? ""}/>
                            )}
                        </FieldRow>
                    )
                }
                {(!stationId || canEdit) && (
                    <>
                        <input
                            type="submit"
                            className="mt-1 bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting || createSuccess}
                            value={isSubmitting
                                ? (stationId ? "Saving..." : "Submitting...")
                                : (stationId ? "Save changes" : "Submit")}
                        />
                        {submitError && <p className="text-red-500 text-xs mt-2">{submitError}</p>}
                        {createSuccess && (
                            <p className="text-green-500 text-xs mt-2">
                                {stationId ? "Station updated successfully!" : "Station created successfully!"}
                            </p>
                        )}
                    </>
                )}
            </form>
            {station && (
                <StationStateActions
                    stationId={stationId!}
                    stationState={station.state}
                    updatedAt={station.updatedAt}
                    userRole={userRole}
                    maxPowerKw={watchedMaxPowerKw}
                    peakRate={watchedPeakRate}
                    offPeakRate={watchedOffPeakRate}
                    onStateChanged={loadStation}
                    onDeleted={loadStation}
                />
            )}
        </>
    );
};

export default StationEditForm;