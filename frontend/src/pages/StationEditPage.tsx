import { useState } from "react";
import { getLogger } from "@/services/logging";
import { createStation } from "@/services/api/adminApi";
import type { AdminCreateStationRequest } from "@/types/stations";
import { useForm, type SubmitHandler } from "react-hook-form"

interface Currency {
    currencyCode: string;
    currencyName: string;
};

const currencies: Currency[] = [
    { currencyCode: "USD", currencyName: "US Dollar" },
    { currencyCode: "EUR", currencyName: "Euro" },
    { currencyCode: "ILS", currencyName: "Israeli Shekel" },
]

const logger = getLogger('StationEditPage');

const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="text-red-500 text-sm mt-0.5">{message}</p> : null;

const StationEditPage = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminCreateStationRequest>();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const isLocked = isSubmitting || submitSuccess;

    const onSubmit: SubmitHandler<AdminCreateStationRequest> = async (data) => {
        logger.debug('Form submitted', data);
        setSubmitError(null);
        try {
            await createStation(data);
            setSubmitSuccess(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setSubmitError(message);
        }
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-4 rounded-lg shadow-md flex flex-col items-center justify-center space-y-4">
            <h1>Create a new station</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
                <div className="mb-1">
                    <label>Station Code (Unique)</label>
                    <input {...register("code", { required: "Station code is required" })} />
                    <FieldError message={errors.code?.message} />
                </div>
                <div className="mb-1">
                    <label>Station Name</label>
                    <input {...register("name", { required: "Station name is required" })} />
                    <FieldError message={errors.name?.message} />
                </div>
                <div className="mb-1">
                    <label>Owner</label>
                    <input {...register("owner", { required: "Owner is required" })} />
                    <FieldError message={errors.owner?.message} />
                </div>
                <div className="mb-1">
                    <label>City</label>
                    <input {...register("city", { required: "City is required" })} />
                    <FieldError message={errors.city?.message} />
                </div>
                <div className="mb-1">
                    <label>Address</label>
                    <input {...register("address", { required: "Address is required" })} />
                    <FieldError message={errors.address?.message} />
                </div>
                <div className="mb-1">
                    <label>Currency</label>
                    <select {...register("ratePlan.currencyCode", { required: "Currency is required" })}>
                        <option value="">-- Select currency --</option>
                        {
                            currencies.map((c) => (
                                <option key={c.currencyCode} value={c.currencyCode}>
                                    {c.currencyName}
                                </option>
                            ))
                        }
                    </select>
                    <FieldError message={errors.ratePlan?.currencyCode?.message} />
                </div>
                <div className="mb-1 flex flex-wrap items-center">
                    <label className="w-1/3">Peak Rate</label>
                    <input type="number" step="0.01" min={0} {...register("ratePlan.peakRate", { valueAsNumber: true })} className="w-2/3" />
                    <FieldError message={errors.ratePlan?.peakRate?.message} />
                </div>
                <div className="mb-1 flex flex-wrap items-center">
                    <label className="w-1/3">Off-peak Rate</label>
                    <input type="number" step="0.01" min={0} {...register("ratePlan.offPeakRate", { valueAsNumber: true })} className="w-2/3" />
                    <FieldError message={errors.ratePlan?.offPeakRate?.message} />
                </div>
                <div className="mb-1">
                    <label>Site Technician Name</label>
                    <input {...register("siteTechnician")} />
                </div>
                <div className="mb-1">
                    <label>Site Technician Phone</label>
                    <input 
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*" 
                        {...register("phone", { pattern: {
                            value: /^0[0-9]{9}$/,
                            message: "Phone must start with 0 and contain exactly 10 digits",
                        }})}
                    />
                    <FieldError message={errors.phone?.message} />
                </div>
                <div className="mb-1">
                    <label>Site Technician Email</label>
                    <input {...register("email")} />
                </div>
                <input
                    type="submit"
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLocked}
                    value={isSubmitting ? "Submitting..." : "Submit"}
                />
                {submitError && <p className="text-red-500 text-sm mt-2">{submitError}</p>}
                {submitSuccess && <p className="text-green-500 text-sm mt-2">Station created successfully!</p>}
            </form>
        </div>
    );
};

export default StationEditPage;