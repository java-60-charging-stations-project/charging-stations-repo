import { useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
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
            navigateBack={navigateBack}
            userRole={"SUPPORT"}
        />
    );
};

export default SupportStationEditPage;