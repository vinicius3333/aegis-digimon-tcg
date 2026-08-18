import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-044.js";

describe("BT2-044 Tyrannomon", () => {
  it("adds a level 5 Digimon and green Tamer from three revealed cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-042", as: "base" }],
        hand: [{ card: "BT2-044", as: "evolving" }],
        deck: ["BT2-043", { card: "BT2-047", as: "digimon" }, { card: "BT1-089", as: "tamer" }, "BT2-043"],
      },
    }, { autoSelectCards: true, autoOrderCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      player.hand.some((card) => card.instanceId === s.inst("digimon").instanceId) &&
      player.hand.some((card) => card.instanceId === s.inst("tamer").instanceId) &&
      player.deck.length === 1 &&
      s.state.pendingDecision === undefined,
    );

    expect(player.deck).toHaveLength(1);
  });

  it("Q1017 accepts a level 4 Digimon at the level-5-or-lower boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-042", as: "base" }],
        hand: [{ card: "BT2-044", as: "evolving" }],
        deck: ["BT2-043", { card: "BT2-046", as: "level5" }, { card: "BT2-044", as: "level4" }, "BT2-043"],
      },
    }, { autoOrderCards: true });
    const player = s.state.players[0] as PlayerState;
    const level4Id = s.inst("level4").instanceId;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.decisions.at(-1)!.req;
    expect(choice.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      level4Id,
      s.inst("level5").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "selectCards", instanceIds: [level4Id] },
    })).toEqual({ ok: true });
    await settle(() =>
      player.hand.some((card) => card.instanceId === level4Id) &&
      player.deck.length === 2 &&
      s.state.pendingDecision === undefined,
    );

    expect(player.hand.some((card) => card.instanceId === level4Id)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("level5").instanceId)).toBe(false);
  });
});
