import {useEffect, useState} from "react";
import type { ApiArrayResponse } from "@/types/apiTypes";
import type { StationBase, StationState } from "@/types/stations";
import { apiClient } from "@/services/api";
import { getLogger } from "@/services/logging";
import EasySpinner from "./EasySpinner";
import { StatusBadgeError, StatusBadgeGreen } from "./StatusBadge";

const logger = getLogger("GuestLogger");

async function fetchStationsList(state: StationState = "ACTIVE", pageSize: number = 10): Promise<StationBase[]> {
    logger.debug("Fetching ACTIVE stations");
    const response = await apiClient.get<ApiArrayResponse<StationBase>>(
        '/stations',
        { params: {state, pageSize} },
    );
    const {data, meta} = response;
    logger.debug("Stations fetched", { meta, stationsCount: data.length });
    return data;
};
const GuestStationsTable = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [stations, setStations] = useState<StationBase[]>([]);

    useEffect(
        () => {
            const fetchBase = async () => {
                setIsLoading(true);
                try {
                    const data = await fetchStationsList();
                    setStations(data);
                }
                catch (e) {
                    const msg = e instanceof Error? e.message: String(e);
                    logger.error("Error fetching stations for guest: ", msg);
                    setError(msg);
                }
                finally {
                    setIsLoading(false);
                }
            }
            void fetchBase();
        }
    , []);
    
    const stationsToDisplay = stations.slice(0, 10);
    return (
        <div className="w-full ">
            {isLoading && <EasySpinner size="md" />}
            {error && <p>Error while loading data: {error}</p>}
            {stationsToDisplay && (
                <table>
                    <thead>
                        <tr>
                            <th className="hidden xl:table-cell">Name</th>
                            <th>City</th>
                            <th className="hidden md:table-cell">Owner</th>
                            <th>Address</th>
                            <th>Busy</th>
                            <th className="hidden md:table-cell">Max power (Kw)</th>
                            <th className="hidden lg:table-cell">Ports</th>
                        </tr>
                    </thead>
                    <tbody>
                    {stationsToDisplay.map(
                        (item: StationBase) => (
                            <tr key={item.id}>
                                <td className="hidden xl:table-cell text-left">{item.name}</td>
                                <td>{item.city}</td>
                                <td className="hidden md:table-cell">{item.owner}</td>
                                <td>{item.address}</td>
                                <td>{item.hasFreePorts? <StatusBadgeGreen labelText="Free ports" />: <StatusBadgeError labelText="Busy" /> }</td>
                                <td className="hidden md:table-cell">{item.maxPowerKw}</td>
                                <td className="hidden lg:table-cell text-center">{item.portsCount}</td>
                            </tr>
                        )
                    )}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default GuestStationsTable;