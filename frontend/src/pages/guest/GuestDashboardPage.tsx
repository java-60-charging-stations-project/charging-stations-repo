import { NavLink } from 'react-router';
import HealthChecker from '@/components/HealthChecker';
import WelcomeTable from '@/components/WelcomeTable';
import NavMenu from '@/components/NavMenu';

const GuestDashboardPage = () => {
  return (
    <>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900">
        <NavMenu />
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-bold">Welcome to the Charging stations application</h1>
          <p className="text-lg">You can <NavLink to="/login">Login</NavLink> or <NavLink to="/register">join us</NavLink></p>
          <div>
            <HealthChecker 
              defaultInfo="Click to check!" 
              endpoint='/health' 
              checkerName='Check backend service'
              buttonColor="secondary"
              buttonSize="small"
            />
            <HealthChecker 
              defaultInfo="Click to check!"
              endpoint='/health/api'
              checkerName='Check backend + lambda'
              buttonColor="tertiary"
              buttonSize="xs"
            />
            <WelcomeTable />
          </div>
        </div>
      </div>
    </>
  )
}

export default GuestDashboardPage;
