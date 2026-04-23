import HealthChecker from '@/components/HealthChecker';
import AsyncHealthChecker from '@/components/AsyncHealthChecker';
import GuestStationsTable from '@/components/GuestStationsTable';
import NavMenu from '@/components/NavMenu';
import { config } from '@/config/env';

const GuestDashboardPage = () => {
  const isSyncLambdaMode = config.lambdaCallMode === 'sync';

  return (
    <>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900">
        <NavMenu />
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-bold py-4">Welcome to the Charging stations application</h1>
          <p className="text-lg py-2">Stations available for our users right now:</p>
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
              {isSyncLambdaMode ? (
                <HealthChecker
                  defaultInfo="Click to check!"
                  endpoint='/health/api'
                  checkerName='Check backend + lambda'
                  buttonColor="tertiary"
                  buttonSize="xs"
                  caption="Check lambdas"
                />
              ) : (
                <AsyncHealthChecker
                  defaultInfo="Click to check!"
                  endpoint='/health/api'
                  responseEndpoint='/health-response'
                  checkerName='Check backend + lambda'
                  buttonColor="tertiary"
                  buttonSize="xs"
                  caption="Check lambdas"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GuestDashboardPage;
