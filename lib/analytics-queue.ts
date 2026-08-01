export type QueuedAnalyticsEvent = {
  eventName: string;
  params: Record<string, unknown>;
};

export function flushQueuedAnalyticsEvents(
  queue: QueuedAnalyticsEvent[],
  dispatch: (event: QueuedAnalyticsEvent) => void,
) {
  const pending = queue.splice(0, queue.length);

  for (const event of pending) {
    dispatch(event);
  }

  return pending.length;
}
