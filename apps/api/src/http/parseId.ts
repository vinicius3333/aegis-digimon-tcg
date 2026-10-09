const MAX_SERIAL_ID = 2147483647;

/** A Postgres `serial` id from a path segment, query value or JSON body, or undefined. */
export function parseId(raw: unknown): number | undefined {
  const text = typeof raw === "number" ? String(raw) : raw;
  if (typeof text !== "string" || !/^\d{1,10}$/.test(text)) return undefined;
  const id = Number(text);
  return id > 0 && id <= MAX_SERIAL_ID ? id : undefined;
}
