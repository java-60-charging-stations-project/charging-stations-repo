import { apiClient } from "@/services/api";
import { useCallback, useState } from "react";
import type { FC } from "react";
import { getLogger } from "@/services/logging";
import type { HealthResponse } from "@/types/responseTypes";
import { config } from "@/config/env";
import SimpleButton, { type ButtonColor, type ButtonSize } from "./SimpleButton";

const API_BASE_URL = config.apiBaseUrl;

const logger = getLogger();

function getTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-GB");
}

interface HealthCheckerProps {
  defaultInfo: string,
  endpoint: string,
  caption?: string,
  checkerName?: string,
  buttonColor?: ButtonColor,
  buttonSize?: ButtonSize,
}

const HealthChecker: FC<HealthCheckerProps> = ({
  defaultInfo, endpoint, caption, checkerName, buttonColor="primary", buttonSize="small"
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [checkInfo, setCheckInfo] = useState<string>(defaultInfo);
  
  const buttonCaption = caption ?? `Check ${endpoint}`;
  const healthCheckUrl = `${API_BASE_URL}${endpoint}`;

  const handleClick = useCallback(
    async () => {
      try {
        setIsLoading(true);
        const { code, status } = await apiClient.get<HealthResponse>(healthCheckUrl);
        setCheckInfo(`Successfully checked at ${getTime()}. Status="${status}", code="${code}"`);
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
      <p>{checkerName ?? `Health checker for ${endpoint}`}</p>
      <SimpleButton handleClick={handleClick} caption={buttonCaption} isLoading={isLoading} color={buttonColor} size={buttonSize} />
      <p>{checkInfo}</p>
    </div>
  )
}

export default HealthChecker;