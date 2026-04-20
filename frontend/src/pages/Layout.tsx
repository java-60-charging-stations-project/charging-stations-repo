import { Outlet, useLocation } from 'react-router';
import { type FC } from 'react';
import NavMenu from "@/components/NavMenu";
import { getRolePageBackgroundClass } from '@/styles/rolePageStyles';
import SessionWatcher from '@/pages/user/SessionWatcher';

const Layout: FC = () => {
  const { pathname } = useLocation();
  const backgroundClassName = getRolePageBackgroundClass(pathname);

  return (
    <div className={`min-h-screen w-full ${backgroundClassName} text-slate-900`}>
      <NavMenu />
      <SessionWatcher />
      <Outlet />
    </div>
  )
}

export default Layout;