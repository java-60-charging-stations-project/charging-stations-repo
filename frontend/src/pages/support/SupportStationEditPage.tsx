import { useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
import { fetchStationById } from "@/services/api/supportApi";
import useFromParam from "@/hooks/useFromParam";


const SupportStationEditPage = () => {
    const navigate = useNavigate();
    const from = useFromParam();

    const navigateBack = () => {
        if (from) {
            navigate(from);
        } else {
            navigate("/support/stations");
        }
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