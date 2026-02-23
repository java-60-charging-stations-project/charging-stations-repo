import { apiClient } from "@/services/api/api";
import { useState } from "react";
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

  logger.debug("HealthChecker rendering...");

  const handleClick = async () => {
    try {
      setIsLoading(true);
      const {code, status} = await apiClient.get<HealthResponse>(endpoint);
      setCheckInfo(`Successfully checked at ${getTime()}. Response: code="${code}", status="${status}"`);
    }
    catch (error) {
      logger.error(`Error while checking endpoint: "${endpoint}". Error: `, error);
      setCheckInfo(`Check failure at ${getTime()}`);
    }
    finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div>
      <p>Health checker for "{endpoint}"</p>
      <button type="button" onClick={handleClick}>
        {isLoading? "Requesting...": buttonCaption}
      </button>
      <p>{checkInfo}</p>
    </div>
  )
}

export default HealthChecker;