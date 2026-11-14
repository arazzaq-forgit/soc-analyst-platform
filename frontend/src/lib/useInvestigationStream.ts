import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { streamSse } from "./sse";

export type StreamStatus = "idle" | "streaming" | "done" | "stopped" | "interrupted" | "error";

export function useInvestigationStream(alertId: string) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setText("");
    setError(null);
    setStatus("streaming");

    let finished = false;
    try {
      await streamSse(`/stream/${encodeURIComponent(alertId)}`, {
        signal: controller.signal,
        onChunk: (chunk) => setText((t) => t + chunk),
        onDone: () => {
          finished = true;
        },
      });
      if (controller.signal.aborted) return;
      setStatus(finished ? "done" : "interrupted");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof ApiError ? err.detail : "The connection was lost.");
      setStatus("error");
    }
  }, [alertId]);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("stopped");
  }, []);

  // Close the stream if the user leaves the page.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return { text, status, error, start, stop };
}
