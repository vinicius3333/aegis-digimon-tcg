import { describe, expect, it } from "vitest";
import { compiled as BT24_067 } from "./BT24-067.js";
import "../index.js";

describe("BT24-067 Hackmon", () => {
  it("limits the linked Rei Katsura play to one or fewer Tamers", () => {
    const watcher = BT24_067.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({ event: "whenLinked" });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      optional: true,
    });
  });
});
