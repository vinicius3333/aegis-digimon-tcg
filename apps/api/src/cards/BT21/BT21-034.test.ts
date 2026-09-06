import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-034.js";
import "../index.js";

describe("BT21-034 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("draws one for its controller whenever this Digimon suspends", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");

    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
      },
    ]);
  });

  it("preserves the WG alternate Digivolution and inherited Jamming", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });

  it("draws exactly one when Kiwimon suspends and ignores another Digimon suspending", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-034", as: "kiwimon" },
          { card: "BT1-009", as: "other" },
        ],
        deck: [
          { card: "BT1-001", as: "firstDraw" },
          { card: "BT1-002", as: "secondDraw" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).verb.suspend([s.perm("kiwimon").permanentId]);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("secondDraw").instanceId]);
  });

  it("draws from a public attack that naturally suspends Kiwimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-034", as: "kiwimon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { security: ["BT1-002"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kiwimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("kiwimon").isSuspended).toBe(true);
  });

  it("evolves from a level-3 WG Digimon for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-033", as: "floramon" }],
        hand: [{ card: "BT21-034", as: "kiwimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("floramon").permanentId,
        instanceId: s.inst("kiwimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("floramon").topCard.cardId === "BT21-034");

    expect(s.state.memory).toBe(1);
    expect(s.perm("floramon").stack.map((card) => card.cardId)).toEqual(["BT21-033"]);
  });

  it("grants Jamming only as an inherited effect", async () => {
    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT21-035", as: "host", under: ["BT21-034"] }] },
    });
    const isolated = setupEngine({ 0: { battleArea: [{ card: "BT21-034", as: "kiwimon" }] } });
    await inherited.ready();
    await isolated.ready();

    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Jamming")).toBe(true);
    expect(observe(isolated.engine).hasKeyword(isolated.perm("kiwimon"), "Jamming")).toBe(false);
  });
  it("publicly proves inherited Jamming survives a losing security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-035", as: "host", under: ["BT21-034"] }] },
      1: { security: ["BT1-069"], deck: ["BT1-009"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(hostId, "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
  });

  it("refuses the alternate evolution from a level-3 without the WG trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "nonWG" }], hand: [{ card: "BT21-034", as: "kiwimon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const handId = s.inst("kiwimon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonWG").permanentId,
        instanceId: handId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
