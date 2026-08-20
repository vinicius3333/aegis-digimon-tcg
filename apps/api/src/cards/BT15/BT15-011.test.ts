import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-011.js";

describe("BT15-011", () => {
  it("reveals four to add a SoC Digimon and a Tamer, then trashes one card if cards were added", () => {
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1 }, { count: 1 }] });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({ kind: "Trash", target: { count: 1, filter: { zone: "hand" } }, condition: { kind: "ifThisEffectActed" } });
  });
});
