import LogsTable from "@/components/LogsTable";
import { config } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";
import { useLogRequestFilterParams } from "@/hooks/useLogRequestFilterParams";
import { usePaginationParams } from "@/hooks/usePaginationParams";

const LogsPage = () => {
    const { userRole } = useAuth();
    const paginationParams = usePaginationParams();
    const { resolved, setResolved } = useLogRequestFilterParams();
    const isUnresolvedOnly = resolved === false;
    const isAdmin = config.adminGroupName === userRole;
    const isSupport = config.supportGroupName === userRole;
    if ( !isAdmin && !isSupport ) {
        return <p>This page is available for the support and admin users.</p>
    }
    const headerText = isSupport ? "Technical support logs" : "Administrator logs";
    return (
        <div>
            <h1 className="text-2xl font-bold text-center">{headerText}</h1>
            <div className="w-full px-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        name="resolved"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        onChange={(event) => setResolved(event.target.checked ? false : undefined)}
                        checked={isUnresolvedOnly}
                    />
                    <span className="text-sm font-medium text-gray-900">Unresolved only</span>
                </label>
            </div>
            <LogsTable
                role={userRole}
                paginationParams={paginationParams}
                filterParams={{resolved}}
            />
        </div>
  );
};

export default LogsPage;