import { getLogger } from "@/services/logging";
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

const StationEditPage = () => {
    const { register, handleSubmit } = useForm<AdminCreateStationRequest>();
    const onSubmit: SubmitHandler<AdminCreateStationRequest> = (data) => {
        logger.debug('Form submitted', data);
    }
    return (
        <div className="max-w-md mx-auto mt-10 p-4 rounded-lg shadow-md flex flex-col items-center justify-center space-y-4">
            <h1>Create a new station</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
                <div className="mb-1">
                    <label>Station Code (Unique)</label>
                    <input {...register("code", { required: true })} />
                </div>
                <div className="mb-1">
                    <label>Station Name</label>
                    <input {...register("name", { required: true })} />
                </div>
                <div className="mb-1">
                    <label>Owner</label>
                    <input {...register("owner", { required: true })} />
                </div>
                <div className="mb-1">
                    <label>City</label>
                    <input {...register("city", { required: true })} />
                </div>
                <div className="mb-1">
                    <label>Address</label>
                    <input {...register("address", { required: true })} />
                </div>
                <div className="mb-1">
                    <label>Currency</label>
                    <select {...register("ratePlan.currencyCode", { required: true })}>
                        <option value="">-- Select currency --</option>
                        {
                            currencies.map((c) => (
                                <option key={c.currencyCode} value={c.currencyCode}>
                                    {c.currencyName}
                                </option>
                            ))
                        }
                    </select>
                </div>
                <div className="mb-1 flex items-center">
                    <label className="w-1/3">Peak Rate</label>
                    <input type="number" step="0.01" min={0} {...register("ratePlan.peakRate", { valueAsNumber: true, })} className="w-2/3" />
                </div>
                <div className="mb-1 flex items-center">
                    <label className="w-1/3">Off-peak Rate</label>
                    <input type="number" step="0.01" min={0} {...register("ratePlan.offPeakRate", { valueAsNumber: true, })} className="w-2/3" />
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
                </div>
                <div className="mb-1">
                    <label>Site Technician Email</label>
                    <input {...register("email")} />
                </div>
                <input type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md" />
            </form>
        </div>
    );
};

export default StationEditPage;