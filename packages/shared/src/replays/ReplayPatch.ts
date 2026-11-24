export type ReplayPatch =
  | { r: unknown }
  | { o: Record<string, ReplayPatch>; d?: string[] }
  | { a: Record<string, ReplayPatch>; n: number };
