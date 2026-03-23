import { createBrowserRouter } from 'react-router';
import LoginPage from '@/pages/guest/LoginPage';
import RegisterPage from '@/pages/guest/RegisterPage';
import GuestDashboardPage from '@/pages/guest/GuestDashboardPage';
import UserDashboardPage from '@/pages/user/UserDashboardPage';
import UserCurrentSessionPage from '@/pages/user/UserCurrentSessionPage';
import UserProfilePage from '@/pages/user/UserProfilePage';
import SupportDashboardPage from '@/pages/support/SupportDashboardPage';
import SupportLogsPage from '@/pages/support/SupportLogsPage';
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
import StationEditPage from '@/pages/StationEditPage';

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
                            { path: "profile", element: <UserProfilePage /> },
                        ]
                    },
                    {
                        path: "/support",
                        element: <RoleRoute role={"SUPPORT"} />,
                        children: [
                            { index: true, element: <SupportDashboardPage /> },
                            { path: "logs", element: <SupportLogsPage /> },
                            { path: "stations", element: <SupportStationsPage /> },
                            { path: "sessions", element: <SupportSessionsPage /> },
                        ]
                    },
                    {
                        path: "/admin",
                        element: <RoleRoute role={"ADMIN"} />,
                        children: [
                            { index: true, element: <AdminDashboardPage /> },
                            { path: "users", element: <AdminUsersPage /> },
                            { path: "users/:userId", element: <AdminUserEditPage /> },
                            { path: "stations", element: <AdminStationsPage /> },
                            { path: "stations/create", element: <StationEditPage /> },
                            { path: "stations/view/:stationId", element: <StationEditPage /> },
                        ]
                    },
                ]
            }
        ]
    },
    //{ path: "*", element: <Navigate to={APP_PATH} replace /> }
]);

export default router;