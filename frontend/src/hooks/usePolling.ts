import { useEffect, useRef } from 'react';

export function usePolling(
  callback: () => void,
  interval: number = 5000,
  enabled: boolean = true,
): void {
  const savedCallback = useRef<() => void>(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => savedCallback.current();
    tick();
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
