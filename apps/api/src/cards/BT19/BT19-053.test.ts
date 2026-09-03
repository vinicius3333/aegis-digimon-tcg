import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-053 QueenBeemon", () => {
  it("publicly uses the Royal Base level-5 cost-3 route and has Alliance/Insectoid", async () => {
    expect(digivolutionRequirementsFor("BT19-053")).toContainEqual({
      level: 5,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-052", as: "base" }],
        hand: [{ card: "BT19-053", as: "queen" }],
        deck: ["BT19-030"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("queen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-053");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-052"]);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("base"), "Insectoid")).toBe(true);
  });

  it("When Attacking plays a face-up Royal Base security Digimon with cost reduced by 8 only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-053", as: "queen" }],
          security: [
            { card: "BT19-052", faceUp: true },
            { card: "BT19-052", faceUp: true },
            { card: "BT19-046", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("queen"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-052")).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "BT19-052")).toHaveLength(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("queen"));
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "BT19-052")).toHaveLength(1);
  });

  it("places all simultaneously leaving Royal Base Digimon, including self, face-up at security bottom (Q3107/Q3108)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-053", as: "queen" },
            { card: "BT19-045", as: "royal" },
            { card: "BT19-046", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("queen").permanentId, s.perm("royal").permanentId, s.perm("plain").permanentId],
        "byEffect",
      ),
    ).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-053", "BT19-045"]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-046");
  });

  it("does not replace battle deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-053", as: "queen" }] } }, { autoAcceptOptional: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("queen").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-053");
  });

  it("resolves When Attacking security play from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-053", as: "queen" }], security: [{ card: "BT19-052", faceUp: true }] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-052"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-052")).toBe(true);
  });
});
