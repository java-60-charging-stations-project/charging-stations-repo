import { apiClient } from "@/services/api";
import { useCallback, useState } from "react";
import type { FC } from "react";
import { getLogger } from "@/services/logging";
import type { HealthResponse } from "@/types/responseTypes";
import { config } from "@/config/env";
import SimpleButton, { type ButtonColor, type ButtonSize } from "./SimpleButton";
import EasySpinner from "./EasySpinner";

const API_BASE_URL = config.apiBaseUrl;

const logger = getLogger();

function getTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-GB");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AsyncHealthCheckerProps {
  defaultInfo: string;
  endpoint: string;
  responseEndpoint: string;
  caption?: string;
  checkerName?: string;
  buttonColor?: ButtonColor;
  buttonSize?: ButtonSize;
  pollingInterval?: number;
  requestCount?: number;
}

type HealthStatus = "healthy" | "unhealthy" | "unknown" | "pending";

interface CommandQueueResponse {
  messageId: string;
}

interface HealthRecordResponse {
  healthy: boolean;
}

const AsyncHealthChecker: FC<AsyncHealthCheckerProps> = ({
  defaultInfo,
  endpoint,
  responseEndpoint,
  caption,
  checkerName,
  buttonColor = "primary",
  buttonSize = "xs",
  pollingInterval = 1000,
  requestCount = 10,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isHealthy, setIsHealthy] = useState<HealthStatus>("unknown");
  const [checkInfo, setCheckInfo] = useState<string>(defaultInfo);

  const buttonCaption = caption ?? `Check ${endpoint}`;

  const runSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const { code, status } = await apiClient.get<HealthResponse>(`${API_BASE_URL}${endpoint}`);
      logger.info("Health check successful", { endpoint, code, status });
      setIsHealthy("healthy");
      setCheckInfo(`Healthy, check time: ${getTime()}. Status="${status}"`);
    } catch (error) {
      logger.error("Health check failed", { endpoint, error });
      setIsHealthy("unhealthy");
      setCheckInfo(`Check failure at ${getTime()}`);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  const runAsync = useCallback(async () => {
    setIsLoading(true);
    setIsHealthy("pending");
    setCheckInfo(`Sending request at ${getTime()}...`);

    let messageId: string;
    try {
      const response = await apiClient.get<CommandQueueResponse>(`${API_BASE_URL}${endpoint}`);
      messageId = response.messageId;
      if (!messageId) {
        throw new Error("No messageId received from command queue");
      }
      logger.info("Async health request queued", { endpoint, messageId });
    } catch (error) {
      logger.error("Async health request failed", { endpoint, error });
      setIsHealthy("unhealthy");
      setCheckInfo(`Check failure at ${getTime()}`);
      setIsLoading(false);
      return;
    }

    setIsPolling(true);
    setCheckInfo(`Awaiting response (messageId=${messageId})...`);

    try {
      for (let attempt = 1; attempt <= requestCount; attempt += 1) {
        try {
          const result = await apiClient.get<HealthRecordResponse>(
            `${API_BASE_URL}${responseEndpoint}`,
            { params: { messageId } },
          );
          if (result.healthy) {
            logger.info("Async health response received: healthy", {
              responseEndpoint,
              messageId,
              attempt,
            });
            setIsHealthy("healthy");
            setCheckInfo(`Healthy, check time: ${getTime()}. Attempts=${attempt}/${requestCount}`);
            return;
          }
          setCheckInfo(`Awaiting response... attempt ${attempt}/${requestCount}`);
        } catch (error) {
          logger.error("Polling request failed", {
            responseEndpoint,
            messageId,
            attempt,
            error,
          });
          setIsHealthy("unhealthy");
          setCheckInfo(`Check failure at ${getTime()}`);
          return;
        }

        if (attempt < requestCount) {
          await delay(pollingInterval);
        }
      }

      logger.warn("Polling limit reached without healthy response", {
        responseEndpoint,
        messageId,
        requestCount,
      });
      setIsHealthy("unhealthy");
      setCheckInfo(`No healthy response after ${requestCount} attempts (time: ${getTime()})`);
    } finally {
      setIsPolling(false);
      setIsLoading(false);
    }
  }, [endpoint, responseEndpoint, pollingInterval, requestCount]);

  const handleClick = useCallback(async () => {
    if (config.lambdaCallMode === "sync") {
      await runSync();
    } else {
      await runAsync();
    }
  }, [runSync, runAsync]);

  return (
    <div className="w-full border-2 border-gray-950 p-4 rounded-md">
      <p className="text-lg font-bold text-center mx-auto">
        {checkerName ?? `Async health checker for ${endpoint}`}
      </p>
      <div className="flex justify-center items-center gap-2">
        <SimpleButton
          handleClick={handleClick}
          caption={buttonCaption}
          isLoading={isLoading}
          color={buttonColor}
          size={buttonSize}
        />
        {isPolling && <EasySpinner size="sm" />}
        <p
          className={`${
            isHealthy === "healthy"
              ? "text-success-600"
              : isHealthy === "unhealthy"
              ? "text-error-600"
              : "text-gray-500"
          }`}
        >
          {checkInfo}
        </p>
      </div>
    </div>
  );
};

export default AsyncHealthChecker;
