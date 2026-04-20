import { createBrowserRouter } from 'react-router';
import LoginPage from '@/pages/guest/LoginPage';
import RegisterPage from '@/pages/guest/RegisterPage';
import GuestDashboardPage from '@/pages/guest/GuestDashboardPage';
import UserDashboardPage from '@/pages/user/UserDashboardPage';
import UserCurrentSessionPage from '@/pages/user/UserCurrentSessionPage';
import UserRecentSessionsPage from '@/pages/user/UserRecentSessionsPage';
import UserProfilePage from '@/pages/user/UserProfilePage';
import UserStationsListPage from '@/pages/user/UserStationsListPage';
import UserStationPage from '@/pages/user/UserStationPage';
import SupportDashboardPage from '@/pages/support/SupportDashboardPage';
import SupportStationsPage from '@/pages/support/SupportStationsPage';
import SupportSessionsPage from '@/pages/support/SupportSessionsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminUserEditPage from '@/pages/admin/AdminUserEditPage';
import AdminStationsPage from '@/pages/admin/AdminStationsPage';
import RoleRoute from './RoleRoute';
import Layout from '@/pages/Layout';
import ConfirmPage from '@/pages/guest/ConfirmPage';
import AppRedirect from './AppRedirect';
import AuthRoute from './AuthRoute';
import { APP_PATH } from './roleNavigation';
import StationPortsViewPage from '@/pages/StationPortsViewPage';
import AdminStationEditPage from '@/pages/admin/AdminStationsEditPage';
import SupportStationEditPage from '@/pages/support/SupportStationEditPage';
import LogsPage from '@/pages/LogsPage';

const router = createBrowserRouter([
    /* Unprotected GUEST pages */
    { path: "/", element: <GuestDashboardPage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegisterPage /> },
    { path: "/confirm", element: <ConfirmPage /> },

    /* AUTHENTICATED AREA */
    {
        element: <AuthRoute />,
        children: [
            /* Role's HOME or redirect to Login if not authenticated */
            { path: APP_PATH, element: <AppRedirect /> },
            {
                element: <Layout />,
                children: [
                    {
                        path: "/user",
                        element: <RoleRoute role={"USER"} />,
                        children: [
                            { index: true, element: <UserDashboardPage /> },
                            { path: "session", element: <UserCurrentSessionPage /> },
                            { path: "recent", element: <UserRecentSessionsPage /> },
                            { path: "stations", element: <UserStationsListPage /> },
                            { path: "stations/:stationId", element: <UserStationPage /> },
                            { path: "profile", element: <UserProfilePage /> },
                        ]
                    },
                    {
                        path: "/support",
                        element: <RoleRoute role={"SUPPORT"} />,
                        children: [
                            { index: true, element: <SupportDashboardPage /> },
                            { path: "logs", element: <LogsPage /> },
                            { path: "stations", element: <SupportStationsPage /> },
                            { path: "stations/view/:stationId/ports", element: <StationPortsViewPage /> },
                            { path: "stations/view/:stationId", element: <SupportStationEditPage /> },
                            { path: "sessions", element: <SupportSessionsPage /> },
                        ]
                    },
                    {
                        path: "/admin",
                        element: <RoleRoute role={"ADMIN"} />,
                        children: [
                            { index: true, element: <AdminDashboardPage /> },
                            { path: "logs", element: <LogsPage /> },
                            { path: "users", element: <AdminUsersPage /> },
                            { path: "users/:userId", element: <AdminUserEditPage /> },
                            { path: "stations", element: <AdminStationsPage /> },
                            { path: "stations/create", element: <AdminStationEditPage /> },
                            { path: "stations/view/:stationId", element: <AdminStationEditPage /> },
                        ]
                    },
                ]
            }
        ]
    },
    //{ path: "*", element: <Navigate to={APP_PATH} replace /> }
]);

export default router;