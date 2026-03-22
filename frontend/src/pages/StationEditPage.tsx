import { useEffect, useState } from "react";
import { getLogger } from "@/services/logging";
import { createStation, fetchStationById } from "@/services/api/adminApi";
import type { AdminCreateStationRequest } from "@/types/stations";
import { useForm, type SubmitHandler } from "react-hook-form";
import { buildHash } from "@/services/utils";
import { CURRENCY_CODE, CURRENCY_NAME } from "@/types/constants";
import NavButton from "@/components/NavButton";
import { useParams } from "react-router-dom";

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

const StationEditPage = () => {
    const { stationId } = useParams<{ stationId: string }>();
    const isViewMode = !!stationId;

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StationFormData>();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const isLocked = isViewMode || isSubmitting || submitSuccess;

    useEffect(() => {
        if (!stationId) return;
        fetchStationById(stationId)
            .then(station => reset({
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
            }))
            .catch(err => setLoadError(err instanceof Error ? err.message : "Failed to load station"));
    }, [stationId, reset]);

    const onSubmit: SubmitHandler<StationFormData> = async (data) => {
        logger.debug('Form submitted', data);
        setSubmitError(null);
        try {
            const code = await buildHash([data.owner, data.city, data.address]);
            const fullData: AdminCreateStationRequest = {
                ...data,
                code,
                ratePlan: {
                    ...data.ratePlan,
                    currencyCode: CURRENCY_CODE,
                    currencyName: CURRENCY_NAME,
                },
            };
            logger.debug('Full data', fullData);
            await createStation(fullData);
            setSubmitSuccess(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setSubmitError(message);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-4 rounded-lg shadow-md flex flex-col space-y-3">
            <div>
                <NavButton to="/admin/stations" caption="← Back to stations" />
            </div>
            <h1 className="text-center">{isViewMode ? "Station details" : "Create a new station"}</h1>
            {loadError && <p className="text-red-500 text-xs">{loadError}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs">
                <FieldRow label="Station Name" error={errors.name?.message}>
                    <input className="w-full" disabled={isLocked} {...register("name", { required: "Station name is required" })} />
                </FieldRow>
                <FieldRow label="Owner" error={errors.owner?.message}>
                    <input className="w-full" disabled={isLocked} {...register("owner", { required: "Owner is required" })} />
                </FieldRow>
                <FieldRow label="City" error={errors.city?.message}>
                    <input className="w-full" disabled={isLocked} {...register("city", { required: "City is required" })} />
                </FieldRow>
                <FieldRow label="Address" error={errors.address?.message}>
                    <input className="w-full" disabled={isLocked} {...register("address", { required: "Address is required" })} />
                </FieldRow>
                <FieldRow label="Latitude" error={errors.location?.latitude?.message}>
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
                </FieldRow>
                <FieldRow label="Longitude" error={errors.location?.longitude?.message}>
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
                </FieldRow>
                <FieldRow label="Max Power (kW)" error={errors.maxPowerKw?.message}>
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
                <FieldRow label="Peak Rate" error={errors.ratePlan?.peakRate?.message}>
                    <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-full"
                        disabled={isLocked}
                        {...register("ratePlan.peakRate", { valueAsNumber: true, required: "Peak rate is required" })}
                    />
                </FieldRow>
                <FieldRow label="Off-peak Rate" error={errors.ratePlan?.offPeakRate?.message}>
                    <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-full"
                        disabled={isLocked}
                        {...register("ratePlan.offPeakRate", { valueAsNumber: true, required: "Off-peak rate is required" })}
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
                            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLocked}
                            value={isSubmitting ? "Submitting..." : "Submit"}
                        />
                        {submitError && <p className="text-red-500 text-xs mt-2">{submitError}</p>}
                        {submitSuccess && <p className="text-green-500 text-xs mt-2">Station created successfully!</p>}
                    </>
                )}
            </form>
        </div>
    );
};

export default StationEditPage;
