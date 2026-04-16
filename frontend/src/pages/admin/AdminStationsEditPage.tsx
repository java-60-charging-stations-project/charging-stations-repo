import { useNavigate } from "react-router";
import StationEditPage from "../StationEditPage";
import useFromParam from "@/hooks/useFromParam";

const AdminStationEditPage = () => {
    const navigate = useNavigate();
    const from = useFromParam();

    const navigateBack = () => {
        if (from) {
            navigate(from);
        } else {
            navigate("/admin/stations");
        }
    };

    return (
        <StationEditPage
            navigateBack={navigateBack}
            userRole={"ADMIN"}
        />
    );
};

export default AdminStationEditPage;