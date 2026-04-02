import SimpleButton from "@/components/SimpleButton";
import StationEditForm from "@/components/StationEditForm";
import { useParams } from "react-router";
import { type FC } from "react";
import type { UserRole } from "@/types";
import type { StationBase } from "@/types/stations";

type StationEditPageProps = {
    userRole: UserRole;
    navigateBack: () => void;
    fetchStationMethod: (stationId: string) => Promise<StationBase>;
}

const StationEditPage: FC<StationEditPageProps> = ({ userRole, navigateBack, fetchStationMethod }) => {
    const { stationId } = useParams<{ stationId: string }>();
    
    return (
        <div className="max-w-md mx-auto mt-5 p-4 text-[9px] leading-tight rounded-lg shadow-md flex flex-col space-y-3">
            <div>
                <SimpleButton color={"primary"} handleClick={navigateBack} caption="← Back to stations" />
            </div>
            <StationEditForm
                stationId={stationId}
                userRole={userRole ?? "USER"}
                fetchStationMethod={fetchStationMethod}
            />
        </div>
    );
};

export default StationEditPage;
