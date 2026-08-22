import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-036.js";
import "../index.js";

describe("BT26-036 Lalamon", () => {
  it("compiles the two printed reveal windows", () => {
    expect(digivolutionRequirementsFor("BT26-036")).toContainEqual({
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["OnPlay", "OnMove"]);
  });
  it("reveals three and adds a matching card while returning the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-036", as: "self" }],
          deck: [{ card: "BT26-061", as: "match" }, { card: "BT1-001" }, { card: "BT1-002" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT26-061"));
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
  });

  it("When Moving adds the green Tamer alternative and bottoms the two nonmatches", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT26-036", as: "mover" },
          deck: [
            { card: "BT1-089", as: "greenTamer" },
            { card: "BT1-085", as: "otherTamer" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("greenTamer").instanceId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenTamer").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greenTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("otherTamer").instanceId,
      s.inst("plain").instanceId,
    ]));
  });

  it("inherited When Attacking suspends one opponent Digimon only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-039", as: "host", under: [{ card: "BT26-036" }] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    const trigger = { attackerPermanentId: s.perm("host").permanentId };

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("uses the exact level-2 DATA SQUAD cost-0 evolution and rejects a near-match", () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT12-001", as: "dataSquadEgg" },
        hand: [{ card: "BT26-036", as: "lalamon" }],
      },
    });
    expect(legal.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: legal.perm("dataSquadEgg").permanentId,
      instanceId: legal.inst("lalamon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "plainEgg" },
        hand: [{ card: "BT26-036", as: "lalamon" }],
      },
    });
    expect(invalid.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: invalid.perm("plainEgg").permanentId,
      instanceId: invalid.inst("lalamon").instanceId,
      useAlternateCost: true,
    })).toEqual(expect.objectContaining({ ok: false }));
  });
});
