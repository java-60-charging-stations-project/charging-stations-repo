import { useLocation, useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
import { fetchStationById } from "@/services/api/supportApi";

const SupportStationEditPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navigateBack = () => {
        const pathFrom = location.state?.from ?? "/support/stations";
        navigate(pathFrom);
    };

    return (
        <StationEditPage
            fetchStationMethod={fetchStationById}
            navigateBack={navigateBack}
            userRole={"SUPPORT"}
        />
    );
};

export default SupportStationEditPage;