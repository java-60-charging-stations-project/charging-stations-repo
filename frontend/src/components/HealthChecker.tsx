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

type HealthStatus = "healthy" | "unhealthy" | "unknown";

const HealthChecker: FC<HealthCheckerProps> = ({
  defaultInfo, endpoint, caption, checkerName, buttonColor="primary", buttonSize="xs"
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHealthy, setIsHealthy] = useState<HealthStatus>("unknown");
  const [checkInfo, setCheckInfo] = useState<string>(defaultInfo);
  
  const buttonCaption = caption ?? `Check ${endpoint}`;

  const handleClick = useCallback(
    async () => {
      try {
        setIsLoading(true);
        const { code, status } = await apiClient.get<HealthResponse>(`${API_BASE_URL}${endpoint}`);
        logger.info("Health check successful", { endpoint, code, status });
        setIsHealthy("healthy");
        setCheckInfo(`Healthy, check time: ${getTime()}. Status="${status}"`);
      }
      catch (error) {
        logger.error("Health check failed", { endpoint, error });
        setIsHealthy("unhealthy");
        setCheckInfo(`Check failure at ${getTime()}`);
      }
      finally {
        setIsLoading(false);
      }
    }, [endpoint]
  );
  
  return (
    <div className="w-full border-2 border-gray-950 p-4 rounded-md">
      <p className="text-lg font-bold text-center mx-auto">{checkerName ?? `Health checker for ${endpoint}`}</p>
      <div className="flex justify-center">
        <SimpleButton handleClick={handleClick} caption={buttonCaption} isLoading={isLoading} color={buttonColor} size={buttonSize} />
        <p className={`${isHealthy === "healthy" ? "text-success-600" : isHealthy === "unhealthy" ? "text-error-600" : "text-gray-500"}`}>{checkInfo}</p>
      </div>
    </div>
  )
}

export default HealthChecker;