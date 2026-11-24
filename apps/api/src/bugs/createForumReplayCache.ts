import type { ReplayRecord } from "#api/replays/inputs/types";

type Render = (record: ReplayRecord) => Promise<Uint8Array>;

const CACHE_LIMIT = 16;

export function createForumReplayCache(render: Render): (id: number, record: ReplayRecord) => Promise<Uint8Array> {
  const done = new Map<number, Uint8Array>();
  const pending = new Map<number, Promise<Uint8Array>>();
  let queue: Promise<unknown> = Promise.resolve();
  return (id, record) => {
    const cached = done.get(id);
    if (cached) return Promise.resolve(cached);
    const running = pending.get(id);
    if (running) return running;
    const next = queue.then(() => render(record));
    queue = next.catch(() => undefined);
    const tracked = next
      .then((file) => {
        done.set(id, file);
        if (done.size > CACHE_LIMIT) done.delete(done.keys().next().value!);
        return file;
      })
      .finally(() => pending.delete(id));
    pending.set(id, tracked);
    return tracked;
  };
}
