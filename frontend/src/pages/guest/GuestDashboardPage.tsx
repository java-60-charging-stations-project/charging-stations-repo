import HealthChecker from '@/components/HealthChecker';
import GuestStationsTable from '@/components/GuestStationsTable';
import NavMenu from '@/components/NavMenu';
import NavButton from '@/components/NavButton';
import { LOGIN_PATH, REGISTER_PATH } from '@/router/roleNavigation';

const GuestDashboardPage = () => {
  return (
    <>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900">
        <NavMenu />
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-bold">Welcome to the Charging stations application</h1>
          <p className="text-lg">
            You can <NavButton to={LOGIN_PATH} caption='Login' color="secondary" size="xs"/> or <NavButton to={REGISTER_PATH} caption="Join us" color="secondary" size="xs"/>
          </p>
          <div className="w-full">
            <GuestStationsTable />
            <div className="w-full flex flex-col md:flex-row justify-between md:justify-center items-center gap-4 pt-7">
              <HealthChecker 
                defaultInfo="Click to check!" 
                endpoint='/health' 
                checkerName='Check backend service'
                buttonColor="tertiary"
                buttonSize="xs"
                caption="Check backend"
              />
              <HealthChecker 
                defaultInfo="Click to check!"
                endpoint='/health/api'
                checkerName='Check backend + lambda'
                buttonColor="tertiary"
                buttonSize="xs"
                caption="Check lambdas"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GuestDashboardPage;
