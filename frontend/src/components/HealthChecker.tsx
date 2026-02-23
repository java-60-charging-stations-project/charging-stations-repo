import { apiClient } from "@/services/api/api";
import { useState } from "react";
import type { FC } from "react";
import { getLogger } from "@/services/logging";

const logger = getLogger();

function getTime(): string {
  const now = new Date();
  return now.toLocaleDateString();
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
      const result = apiClient.get(endpoint);
      setCheckInfo(`Successfully checked at ${getTime()}. Response: "${result.toString()}"`);
    }
    catch (error) {
      logger.error(`Error while checking endpoint: "${endpoint}"`);
      setCheckInfo(`Check failure at ${getTime()}. Error: ${error}`);
    }
    finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div>
      <button type="button" onClick={handleClick}>
        {isLoading? "Requesting...": buttonCaption}
      </button>
      <p>{checkInfo}</p>
    </div>
  )
}

export default HealthChecker;