import LogsTable from "@/components/LogsTable";
import { config } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";

const LogsPage = () => {
    const { userRole } = useAuth();
    const isAdmin = config.adminGroupName === userRole;
    const isSupport = config.supportGroupName === userRole;
    if ( !isAdmin || !isSupport ) {
        return <p>This page is available for the support and admin users.</p>
    }
    const headerText = isSupport ? "Technical support logs" : "Administrator logs";
    return (
        <div>
            <h1 className="text-2xl font-bold text-center">{headerText}</h1>
            <LogsTable role={userRole} />
        </div>
  );
};

export default LogsPage;