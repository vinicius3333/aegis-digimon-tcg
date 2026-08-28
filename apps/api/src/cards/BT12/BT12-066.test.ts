import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import "./BT12-066.js";

describe("BT12-066 Mercurymon", () => {
  it("digivolves for 0 from Sephirothmon", async () => {
    expect(digivolutionRequirementsFor("BT12-066")).toContainEqual({
      names: ["Sephirothmon"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-065", as: "sephiroth" }],
        hand: [{ card: "BT12-066", as: "mercury" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sephiroth").permanentId,
        instanceId: s.inst("mercury").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sephiroth").topCard.cardId === "BT12-066");
    expect(s.state.memory).toBe(0);
    expect(s.perm("sephiroth").stack.map(({ cardId }) => cardId)).toEqual(["BT12-065"]);
  });

  it("digivolves from a black Tamer for 2, draws, and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-094", as: "tamer" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT12-066", as: "mercury" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-094"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects the Tamer evolution route from a non-black Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "blueTamer" }], hand: [{ card: "BT12-066", as: "mercury" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("mercury").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives one of your Digimon Blocker when played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "ally" }], hand: [{ card: "BT12-066", as: "mercury" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercury").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });

  it("gives one of your Digimon Blocker when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally" },
            { card: "BT12-066", as: "mercury" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mercury"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });
});
