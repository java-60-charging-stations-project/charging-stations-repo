import { useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
import { fetchStationById } from "@/services/api/adminApi";
import useFromParam from "@/hooks/useFromParam";

const AdminStationEditPage = () => {
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
            userRole={"ADMIN"}
        />
    );
};

export default AdminStationEditPage;