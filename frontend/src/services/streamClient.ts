import { api } from './api';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullBrief: string) => void;
  onError: (err: Error) => void;
}

export function streamInvestigation(
  alertId: string,
  callbacks: StreamCallbacks,
  mockMode: boolean = false
) {
  if (mockMode) {
    // Simulated realistic SSE typewriter stream
    const mockBrief = `1. SUMMARY
Automated security analytics detected high-risk telemetry indicating targeted malicious intrusion on asset corresponding to alert ${alertId}. The observed event behavior matches known adversarial execution playbooks.

2. SEVERITY ASSESSMENT
High – Correlated multi-stage indicators show active exploitation with high confidence.

3. EVIDENCE
- Systematic reconnaissance and anomalous packet flows verified [alrt_${alertId.slice(-6)}].
- Signature payload verification matches documented MITRE ATT&CK technique indicators.
- Ingress activity contradicts established baseline access schedules.

4. RECOMMENDED ACTION
Initiate perimeter containment, revoke related session tokens, and deploy enhanced EDR trace collectors on adjacent subnet assets.`;

    let currentIndex = 0;
    const words = mockBrief.split(' ');
    let assembled = '';

    const interval = setInterval(() => {
      if (currentIndex >= words.length) {
        clearInterval(interval);
        callbacks.onDone(assembled);
        return;
      }
      const chunk = (currentIndex === 0 ? '' : ' ') + words[currentIndex];
      assembled += chunk;
      callbacks.onChunk(chunk);
      currentIndex++;
    }, 45);

    return () => clearInterval(interval);
  }

  // Real backend SSE stream (/stream/{alertId})
  const token = api.getAccessToken();
  const controller = new AbortController();

  fetch(`/stream/${alertId}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`SSE stream failed: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim().replace(/\\n/g, '\n');
            fullText += data;
            callbacks.onChunk(data);
          }
          if (line.startsWith('event: done')) {
            callbacks.onDone(fullText);
          }
        }
      }
      callbacks.onDone(fullText);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    });

  return () => controller.abort();
}
