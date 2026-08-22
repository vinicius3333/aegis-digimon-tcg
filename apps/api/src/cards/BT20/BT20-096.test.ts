import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-096.js";

describe("BT20-096 Black Sabbath", () => {
  it("gates the trash activation's deletion on the 6-memory return cost", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect).toMatchObject({
      actions: [
        { kind: "Return", to: "deckBottom", condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 }, cost: { kind: "payMemory", memory: 6 }, abortOnDecline: true },
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true } } },
      ],
    });
  });

  it("trashes one hand card before deleting an opposing level 4 or lower Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.isFromTrash)).toMatchObject({
      actions: [
        { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        { kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } },
      ],
    });
  });
});
