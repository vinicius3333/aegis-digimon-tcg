import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-083.js";

describe("BT13-083 Gizmon: AT", () => {
  it("reduces play cost by deleting a level 3 Digimon", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0] as {
      actions?: unknown[];
    };
    expect(replacement).toMatchObject({
      sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon: AT"] }] },
    });
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 4,
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 } },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("draws 2, trashes 2, and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      restriction: "digivolve",
      duration: "permanent",
    });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: XT", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["trash"],
      target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Gizmon: XT"] }] }, count: 1 },
      cost: {
        kind: "return",
        target: {
          filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 2,
        },
      },
    });
  });

  it("draws two cards and trashes two cards from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "gizmon" }],
          deck: ["BT1-001", "BT1-002"],
          hand: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gizmon"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-003", "BT1-004"]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });
});
