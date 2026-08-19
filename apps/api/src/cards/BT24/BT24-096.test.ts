import { describe, expect, it } from "vitest";
import { compiled as BT24_096 } from "./BT24-096.js";
import "../index.js";

describe("BT24-096 Creepymon: X Antibody", () => {
  it("returns itself to deck bottom when the named digivolution occurs", () => {
    const watcher = BT24_096.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(watcher).toMatchObject({ isFromTrash: true });
    expect(watcher?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Creepymon (X Antibody)"], match: "nameExact" }],
      },
    });
    expect((watcher?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "ActivateMain",
      optional: true,
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true }, count: 1 } },
    });
    const main = BT24_096.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
        count: 1,
      },
    });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "TrashTopDeck",
      controller: "opponent",
      amount: 3,
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });
});
