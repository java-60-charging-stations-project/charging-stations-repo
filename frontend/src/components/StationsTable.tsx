import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiArrayResponse } from "@/types/apiTypes";
import type { StationBase, StationsListParams, StationState } from "@/types/stations";
import { useStationsQuery } from "@/hooks/useStationsQuery";
import SimpleButton from "./SimpleButton";
import { getLogger } from "@/services/logging";
import Paginator from "./Paginator";
import { StationStateBadge } from "./StatusBadge";

const logger = getLogger("StationsTable");

const STATE_OPTIONS: StationState[] = [
    "INACTIVE",
    "ACTIVE",
    "OUT_OF_SERVICE",
    "DELETED",
];

export interface StationsTableProps {
    // Must be a stable reference (module-level import)
    fetchFn: (params: StationsListParams) => Promise<ApiArrayResponse<StationBase>>;
    // If provided, station name becomes a clickable link navigating to this path.
    detailPath?: (stationId: string) => string;
}

function SortButton({
    label,
    field,
    orderBy,
    onSort,
}: {
    label: string;
    field: string;
    orderBy: string | undefined;
    onSort: (value: string) => void;
}) {
    const indicator = orderBy === `${field}+` ? " ↑" : orderBy === `${field}-` ? " ↓" : "";
    const next = orderBy === `${field}+` ? `${field}-` : `${field}+`;
    return (
        <button
            className="hover:underline font-semibold"
            onClick={() => onSort(next)}
        >
            {label}{indicator}
        </button>
    );
}

const StationsTable: FC<StationsTableProps> =({ fetchFn, detailPath }) => {
    const navigate = useNavigate();
    const { isLoading, error, stations, meta, parameters, setters } =
        useStationsQuery(fetchFn);

    // Local draft state for text inputs — committed to URL only on "Load"
    const [cityInput, setCityInput] = useState(() => parameters.city ?? "");
    const [ownerInput, setOwnerInput] = useState(() => parameters.owner ?? "");

    const handleLoad = () => {
        logger.debug("Loading stations", { city: cityInput, owner: ownerInput });
        setters.setTextFilters(
            cityInput.length > 0 ? cityInput : undefined,
            ownerInput.length > 0 ? ownerInput : undefined,
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleLoad();
    };

    return (
        <div className="text-[10px] leading-tight">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
                <input
                    className="border border-slate-300 px-1.5 py-0.5 rounded"
                    placeholder="City"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <input
                    className="border border-slate-300 px-1.5 py-0.5 rounded"
                    placeholder="Owner"
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <select
                    className="border border-slate-300 px-1.5 py-0.5 rounded bg-white"
                    value={parameters.state ?? ""}
                    onChange={(e) =>
                        setters.setStateFilter(e.target.value as StationState || undefined)
                    }
                >
                    <option value="">All states</option>
                    {STATE_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <SimpleButton
                    caption="Load"
                    size="xs"
                    color="secondary"
                    handleClick={handleLoad}
                />
                {isLoading && (
                    <span className="text-slate-400 italic">Loading…</span>
                )}
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-600 font-bold border-2 border-yellow-500 p-2 rounded mb-2">
                    Error: {error.message}
                </p>
            )}

            {/* Table */}
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="text-left">
                            <SortButton
                                label="Name"
                                field="name"
                                orderBy={parameters.orderBy}
                                onSort={setters.setOrderBy}
                            />
                        </th>
                        <th className="text-left">
                            <SortButton
                                label="Owner"
                                field="owner"
                                orderBy={parameters.orderBy}
                                onSort={setters.setOrderBy}
                            />
                        </th>
                        <th className="text-left">City</th>
                        <th className="text-left">Address</th>
                        <th className="text-left">State</th>
                        <th className="text-left">Ports</th>
                    </tr>
                </thead>
                <tbody>
                    {stations.map((station) => (
                        <tr key={station.id}>
                            <td>
                                {detailPath ? (
                                    <button
                                        className="text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                                        onClick={() => navigate(detailPath(station.id))}
                                    >
                                        {station.name}
                                    </button>
                                ) : (
                                    station.name
                                )}
                            </td>
                            <td>{station.owner}</td>
                            <td>{station.city}</td>
                            <td>{station.address}</td>
                            <td>
                                <StationStateBadge state={station.state} />
                            </td>
                            <td>{station.ports}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {
                meta && <Paginator
                    onPageChange={(p) => setters.setPage(p)}
                    activePage={parameters.page}
                    totalPages={meta.totalPages}
                />
            }
        </div>
    );
}

export default StationsTable;
