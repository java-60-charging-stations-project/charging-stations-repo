import { useLocation, useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
import { fetchStationById } from "@/services/api/adminApi";

const AdminStationEditPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navigateBack = () => {
        const pathFrom = location.state?.from ?? "/admin/stations";
        navigate(pathFrom);
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