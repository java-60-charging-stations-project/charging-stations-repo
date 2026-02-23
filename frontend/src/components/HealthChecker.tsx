import { apiClient } from "@/services/api";
import { useCallback, useState } from "react";
import type { FC } from "react";
import { getLogger } from "@/services/logging";

const logger = getLogger();

function getTime(): string {
  const now = new Date();
  return now.toTimeString();
}

interface HealthResponse {
    code: number;
    status: string;
}

interface HealthCheckerProps {
  defaultInfo: string,
  endpoint: string,
  buttonText?: string,
}

const HealthChecker: FC<HealthCheckerProps> = ({
  defaultInfo, endpoint, buttonText}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [checkInfo, setCheckInfo] = useState<string>(defaultInfo);
  
  const buttonCaption = buttonText ?? `Check ${endpoint}`;

  const handleClick = useCallback(
    async () => {
      try {
        setIsLoading(true);
        const { code, status } = await apiClient.get<HealthResponse>(endpoint);
        setCheckInfo(`Successfully checked at ${getTime()}. Response: code="${code}", status="${status}"`);
      }
      catch (error) {
        logger.error("Health check failed", { endpoint, error });
        setCheckInfo(`Check failure at ${getTime()}`);
      }
      finally {
        setIsLoading(false);
      }
    }, [endpoint]
  );
  
  return (
    <div>
      <p>Health checker for {endpoint}</p>
      <button type="button" onClick={handleClick} disabled={isLoading}>
        {isLoading? "Requesting...": buttonCaption}
      </button>
      <p>{checkInfo}</p>
    </div>
  )
}

export default HealthChecker;