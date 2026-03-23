import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiArrayResponse } from "@/types/apiTypes";
import type { StationBase, StationsListParams, StationState } from "@/types/stations";
import { useStationsQuery } from "@/hooks/useStationsQuery";
import SimpleButton from "./SimpleButton";

const STATE_OPTIONS: StationState[] = ["INACTIVE", "ACTIVE", "OUT_OF_SERVICE"];

export interface StationsTableProps {
    /** Must be a stable reference (module-level import). Inline arrows will cause infinite refetch. */
    fetchFn: (params: StationsListParams) => Promise<ApiArrayResponse<StationBase>>;
    /** If provided, station name becomes a clickable link navigating to this path. */
    detailPath?: (stationId: string) => string;
    /** Render per-row action buttons. Receives the station and a refresh callback. */
    renderActions?: (station: StationBase, refresh: () => void) => React.ReactNode;
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

export function StationsTable({ fetchFn, detailPath, renderActions }: StationsTableProps) {
    const navigate = useNavigate();
    const { isLoading, error, stations, meta, parameters, setters, refresh } =
        useStationsQuery(fetchFn);

    // Local draft state for filter inputs — committed to URL only on "Load"
    const [cityInput, setCityInput] = useState(() => parameters.city ?? "");
    const [ownerInput, setOwnerInput] = useState(() => parameters.owner ?? "");

    const handleLoad = () => {
        setters.setCity(cityInput);
        setters.setOwner(ownerInput);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleLoad();
    };

    return (
        <div className="text-xs">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
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
                        setters.setState((e.target.value as StationState) || undefined)
                    }
                >
                    <option value="">All states</option>
                    {STATE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
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
                        {renderActions && <th className="text-left">Actions</th>}
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
                            <td>{station.state}</td>
                            {renderActions && (
                                <td>{renderActions(station, refresh)}</td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {meta && (
                <div className="flex items-center gap-2 mt-2">
                    <SimpleButton
                        caption="Prev"
                        size="xs"
                        color="tertiary"
                        isDisabled={parameters.page <= 1}
                        handleClick={() => setters.setPage(parameters.page - 1)}
                    />
                    <span>
                        Page {meta.page} of {meta.totalPages}
                        <span className="text-slate-400 ml-1">({meta.totalItems} total)</span>
                    </span>
                    <SimpleButton
                        caption="Next"
                        size="xs"
                        color="tertiary"
                        isDisabled={parameters.page >= meta.totalPages}
                        handleClick={() => setters.setPage(parameters.page + 1)}
                    />
                </div>
            )}
        </div>
    );
}

export default StationsTable;
