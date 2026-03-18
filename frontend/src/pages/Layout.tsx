import { Outlet } from 'react-router';
import { type FC } from 'react';
import NavMenu from "@/components/NavMenu";

const Layout: FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <NavMenu />
      <Outlet />
    </div>
  )
}

export default Layout;