import './App.css'
import HealthChecker from '@/components/HealthChecker';

const App = () => {
  return (
    <>
      <div>
        Welcome to the Charging stations application
        <HealthChecker defaultInfo="Didn't check yet. Click the button!" endpoint='/health'/>
      </div>
    </>
  )
}

export default App
