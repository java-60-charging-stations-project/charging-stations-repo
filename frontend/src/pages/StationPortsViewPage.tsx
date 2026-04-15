import { useParams } from "react-router-dom";
import NavButton from "@/components/NavButton";
import PortsView from "@/components/stations/PortsView";
import useFromParam from "@/hooks/useFromParam";
import { useGetStationQuery } from "@/store/apiSlice";
import EasySpinner from "@/components/EasySpinner";

const StationPortsViewPage = () => {
    const { stationId } = useParams<{ stationId: string }>();
    const from = useFromParam();
    const fromPath = from ? encodeURIComponent(from) : "";

    const {
            data: station,
            isLoading,
            isError,
            error: loadError,
        } = useGetStationQuery(
            { stationId: stationId!, role: "SUPPORT"},
            { skip: !stationId }
        );

    if (!stationId) {
        return (
            <div className="max-w-md mx-auto mt-5 p-4 text-xs text-red-500">
                Missing station id.
            </div>
        );
    }

    const backToStationPath = `/support/stations/view/${stationId}${from?`?from=${fromPath}`:""}`;

    return (
        <div className="max-w-md mx-auto mt-5 p-4 text-[9px] leading-tight rounded-lg shadow-md flex flex-col space-y-3">
            <div>
                <NavButton to={backToStationPath} caption="← Back to station" />
            </div>
            <h2 className="text-center text-lg font-bold">Station ports</h2>
            {
                isLoading && (
                    <EasySpinner />
                )
            }
            {isError && (
                <p className="text-red-500 text-xs">{loadError.message ?? "Unable to load station"}</p>
            )}
            {station && (
                <PortsView
                    stationId={stationId}
                    stationState={station.state}
                />
            )}
        </div>
    );
};

export default StationPortsViewPage;
