// Thin typed wrapper around EventSource. Every event name here must match
// backend/app/streaming/events.py's EventType constants exactly.

export type ReasoningEventHandler = (data: Record<string, unknown>) => void;

export interface StreamHandlers {
  [eventName: string]: ReasoningEventHandler | undefined;
}

export function openEventStream(url: string, handlers: StreamHandlers): () => void {
  const source = new EventSource(url);

  for (const [eventName, handler] of Object.entries(handlers)) {
    if (!handler) continue;
    source.addEventListener(eventName, (e) => {
      try {
        handler(JSON.parse((e as MessageEvent).data));
      } catch {
        // malformed event payload - ignore rather than crash the stream
      }
    });
  }

  return () => source.close();
}
