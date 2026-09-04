import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-047.js";

describe("EX6-047 Boogiemon", () => {
  it("reveals three for Fallen Angel/Demon Lord and purple Options, then trashes a hand card if it added", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, to: "hand" },
          { count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      },
      { kind: "Trash", condition: { kind: "ifThisEffectActed" } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));

  it("publicly reveals three cards, adds the eligible Digimon and Option, then trashes one hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-047", as: "boogie" }],
          deck: ["EX6-059", "EX6-069", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boogie").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boogie").instanceId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boogie").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(1);
    expect(s.state.players[0]!.trash.length).toBe(1);
  });
});
