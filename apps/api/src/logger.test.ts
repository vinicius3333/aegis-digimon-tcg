import { expect, it } from "vitest";
import { serializeLog } from "./logger.js";

it("serializes circular debug data and bigint without interrupting the game", () => {
  const value: { self?: unknown; amount: bigint } = { amount: 4n };
  value.self = value;
  expect(JSON.parse(serializeLog(value))).toEqual({ amount: "4", self: "[Circular]" });
});
