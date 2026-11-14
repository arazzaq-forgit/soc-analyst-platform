import { ApiError, forceLogout, refreshAccessToken } from "../api/client";
import { API_URL } from "./config";
import { getAccessToken } from "./tokens";

interface StreamOptions {
  signal: AbortSignal;
  onChunk: (text: string) => void;
  onDone: () => void;
}

function open(path: string, signal: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { headers, signal });
}

// Reads a Server-Sent Events stream with fetch, so the Bearer token can be sent.
// Format used by the backend: "data: <text with \n escaped>" and a final "event: done".
export async function streamSse(path: string, options: StreamOptions): Promise<void> {
  const { signal, onChunk, onDone } = options;

  let res: Response;
  try {
    res = await open(path, signal);
    if (res.status === 401) {
      if (await refreshAccessToken()) res = await open(path, signal);
      if (res.status === 401) forceLogout();
    }
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ApiError(0, "Cannot reach the server. Is the backend running on port 8000?");
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      res.status === 404 ? "Alert not found." : `Request failed (${res.status})`,
    );
  }
  if (!res.body) throw new ApiError(0, "Streaming is not supported by this browser.");

  const handleBlock = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        let value = line.slice(5);
        if (value.startsWith(" ")) value = value.slice(1);
        data.push(value);
      }
    }
    if (event === "done") {
      onDone();
      return;
    }
    if (data.length === 0) return;
    onChunk(data.join("\n").replace(/\\n/g, "\n"));
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");
    for (;;) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      handleBlock(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
}
