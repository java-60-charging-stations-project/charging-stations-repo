import { useNavigate } from "react-router";
import MeChecker from "@/components/MeChecker";

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>ADMIN DASHBOARD PAGE</h1>
      <MeChecker />
      <button onClick={() => navigate("/admin/users")}>Manage Users</button>
    </div>
  );
};

export default AdminDashboardPage;
