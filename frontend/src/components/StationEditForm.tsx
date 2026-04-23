import { useState, useEffect, type FC } from "react";
import { getLogger } from "@/services/logging";
import type { AdminCreateStationRequest, AdminUpdateStationRequest, StationState } from "@/types/stations";
import { useForm, type SubmitHandler } from "react-hook-form";
import { config } from "@/config/env";
import StationStateActions from "@/components/stations/StationStateActions";
import EasyButton from "@/components/EasyButton";
import { useNavigate } from "react-router";
import useFromParam from "@/hooks/useFromParam";
import { useCreateStationMutation, useGetStationQuery, useUpdateStationMutation } from "@/store/apiSlice";
import type { UserRole } from "@/types";
import EasySpinner from "./EasySpinner";
import MapBaseComponent from "./MapBaseComponent";
import Modal from "./Modal";
import type { AddressData, LatLng } from "@/types/maps";
import { extractAddress } from "@/utils/mapUtils";
import owners from "@/config/owners.json";

const logger = getLogger("StationEditForm");

function canEditStation(userRole: UserRole, stationState: StationState): boolean {
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
    userRole: UserRole;
    stationId: string | undefined;
};

const StationEditForm: FC<StationEditFormProps> = ({
    userRole = "ADMIN",
    stationId,
}) => {
    const { register, handleSubmit, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<StationFormData>();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [stationLatLng, setStationLatLng] = useState<LatLng | undefined>(undefined);
    const [stationAddress, setStationAddress] = useState<AddressData | null>(null);
    const isSupportUser = userRole === "SUPPORT";
    
    const navigate = useNavigate();
    const from = useFromParam();
    const [updateStationMutation, { isLoading: isUpdating }] = useUpdateStationMutation();
    const [createStationMutation, { isLoading: isCreating }] = useCreateStationMutation();
    
    const {
        data: station,
        isLoading,
        isError,
        error: loadError,
    } = useGetStationQuery(
        { stationId: stationId!, role: userRole},
        { skip: !stationId }
    );

    const isEditing = stationId !== undefined;
    const isLocked = !isEditing && (isSubmitting || createSuccess);
    const canEdit = station? canEditStation(userRole, station.state): false;

    const isEditableFieldLocked = isLocked || (isEditing && (!canEdit || isSubmitting));

    const fromPath = from ? encodeURIComponent(from) : "";

    useEffect(() => {
        if (station) {
            reset({
                name: station.name,
                owner: station.owner,
                city: station.city,
                address: station.address,
                location: station.location,
                maxPowerKw: station.maxPowerKw ?? 0,
                ratePlan: station.ratePlan,
                siteTechnician: station.siteTechnician,
                phone: station.phone,
                email: station.email,
            });
        }
    }, [station, reset]);

    const onSubmit: SubmitHandler<StationFormData> = async (data) => {
        logger.debug('Form submitted', data);
        setSubmitError(null);
        try {
            if (stationId && canEdit) {
                const updateData: AdminUpdateStationRequest = {
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
                logger.debug('Update station payload', updateData);
                await updateStationMutation({stationId, role: userRole, body: updateData}).unwrap();
                logger.debug('Station updated successfully');
            }
            else {
                const code = `${data.owner}=+=${data.city}=+=${data.address}`;
                const createData: AdminCreateStationRequest = {
                    ...data,
                    code,
                    ratePlan: {
                        ...data.ratePlan,
                        currencyCode: config.currency.code,
                        currencyName: config.currency.name,
                    },
                };
                logger.debug('Create station payload', createData);
                await createStationMutation(createData).unwrap();
                logger.debug('Station created successfully');
                setCreateSuccess(true);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setSubmitError(message);
        }
    };

    const ratesTitle = `Rates in ${config.currency.code}`;
    const isBusy = isSubmitting || isUpdating || isCreating;

    const tryGenerateStationName = (overrides?: { owner?: string; city?: string }) => {
        const owner = (overrides?.owner ?? getValues("owner") ?? "").trim();
        const city = (overrides?.city ?? getValues("city") ?? "").trim();
        const currentName = (getValues("name") ?? "").trim();

        if (!owner || !city || currentName) {
            return;
        }

        const firstOwnerWord = owner.split(/\s+/)[0];
        if (!firstOwnerWord) {
            return;
        }

        setValue("name", `${firstOwnerWord} ${city} One`, {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    const handleMapClick = async (position: LatLng) => {
        try {
            const extracted = await extractAddress(position);
            setStationLatLng(position);
            setStationAddress(extracted);
        } catch (err) {
            logger.error('Failed to extract address from map click', err);
        }
    };

    const handleMapModalClose = () => {
        const lat = stationLatLng?.lat;
        const lng = stationLatLng?.lng;
        const address = stationAddress?.address;
        const city = stationAddress?.city;
        
        if (lat) {
            setValue("location.latitude", lat, { shouldValidate: true, shouldDirty: true });
        }
        if (lng) {
            setValue("location.longitude", lng, { shouldValidate: true, shouldDirty: true });
        }
        setValue("address", address ?? "", { shouldValidate: true, shouldDirty: true });
        setValue("city", city ?? "", { shouldValidate: true, shouldDirty: true });

        tryGenerateStationName({ city: city ?? "" });

        setIsMapModalOpen(false);
    };

    if (stationId && isLoading) {
        return (
            <>
                <h1 className="text-center">Station details</h1>
                <EasySpinner />
                <p className="text-center text-gray-500 text-xs">Loading station details...</p>
            </>
        );
    }

    return (
        <>
            <h1 className="text-center">{stationId ? "Station details" : "Create a new station"}</h1>
            {isError && loadError?.message && <p className="text-red-500 text-xs">{loadError.message}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs">
                <div className="mb-1 flex items-center flex-wrap">
                    <label className={LABEL}>City</label>
                    <div className="flex-1 flex gap-2 min-w-0 items-center">
                        <input
                            className="flex-1 min-w-0"
                            disabled={isLocked || isEditing}
                            {...register("city", { required: "City is required" })}
                        />
                        {config.useGMaps && isLocked === false && (
                            <EasyButton onClick={() => setIsMapModalOpen(true)}>
                                Map
                            </EasyButton>
                        )}
                    </div>
                    {errors.city?.message && (
                        <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">{errors.city.message}</p>
                    )}
                </div>
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
                <FieldRow label="Owner" error={errors.owner?.message}>
                    {(() => {
                        const ownerField = register("owner", { required: "Owner is required" });
                        return (
                            <select
                                className="w-full"
                                disabled={isLocked || isEditing}
                                defaultValue=""
                                {...ownerField}
                                onChange={(e) => {
                                    ownerField.onChange(e);
                                    tryGenerateStationName({ owner: e.target.value });
                                }}
                            >
                                <option value="">--- Select station owner ---</option>
                                {owners.map((ownerName) => (
                                    <option key={ownerName} value={ownerName}>
                                        {ownerName}
                                    </option>
                                ))}
                            </select>
                        );
                    })()}
                </FieldRow>
                <FieldRow label="Station Name" error={errors.name?.message}>
                    <input className="w-full" disabled={isLocked || isEditing} {...register("name", { required: "Station name is required" })} />
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
                            disabled={isBusy || createSuccess}
                            value={isBusy
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
            {station && <StationStateActions station={station} userRole={userRole}/>}
            <Modal
                isOpen={isMapModalOpen}
                onClose={handleMapModalClose}
                showCloseButton={true}
                panelClassName="max-w-3xl"
            >
                <h2 className="text-lg font-bold mb-2">Choose the station on location on the map:</h2>
                <MapBaseComponent
                    position={stationLatLng ?? { lat: config.mapsStartLat, lng: config.mapsStartLng }}
                    markedPoint={stationLatLng}
                    onClick={handleMapClick}
                />
                <div className="mt-3 text-sm space-y-1">
                    <p>Address: {stationAddress?.address ?? ""}</p>
                    <p>Latitude: {stationLatLng?.lat ?? ""}</p>
                    <p>Longitude: {stationLatLng?.lng ?? ""}</p>
                </div>
            </Modal>
        </>
    );
};

export default StationEditForm;