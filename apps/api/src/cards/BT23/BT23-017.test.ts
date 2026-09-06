import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-017.js";

describe("BT23-017 Betamon", () => {
  it("matches the catalog and carries every main, inherited, and evolution clause", () => {
    expect(getCardDefinition("BT23-017")).toMatchObject({
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Amphibian", "Hudie", "CS"],
    });
    const main = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(main.actions[0]).toMatchObject({
      kind: "Return",
      target: {
        filter: {
          zone: "trash",
          kind: ["Digimon", "Tamer", "Option"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        count: 1,
      },
      to: "hand",
      cost: {
        kind: "trash",
        optional: true,
        target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
      },
      optional: true,
      abortOnDecline: true,
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        bindResultAs: "playedHudie",
        target: { filter: { kind: ["Digimon"], playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"] }] } },
      },
      { kind: "Restrict", restriction: "digivolve", duration: "permanent" },
      { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays the hand-trash cost and returns exactly one non-Digi-Egg CS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "betamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
          trash: [
            { card: "BT23-086", as: "csTamer" },
            { card: "BT23-001", as: "csEgg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("betamon"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("csTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("csEgg").instanceId]),
    );
  });

  it("allows the On Play cost-and-return effect to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-017", as: "betamon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "BT23-086", as: "target" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("betamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("betamon").instanceId),
    );
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("plays Betamon publicly, pays the hand-trash cost, and recovers the exact CS card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-017", as: "betamon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [
            { card: "BT23-086", as: "csTamer" },
            { card: "BT23-001", as: "csEgg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const betamonId = s.inst("betamon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: betamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === betamonId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("csTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("csEgg").instanceId);
  });

  it("evolves from a breeding CS egg with the exact source stack and zero memory cost", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT23-002", as: "sourceEgg" },
        hand: [{ card: "BT23-017", as: "betamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 3;
    const sourceId = s.inst("sourceEgg").instanceId;
    const betamonId = s.inst("betamon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceEgg").permanentId,
        instanceId: betamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceEgg").topCard.instanceId === betamonId);
    expect(s.perm("sourceEgg").stack).toHaveLength(1);
    expect(s.perm("sourceEgg").stack[0]!.instanceId).toBe(sourceId);
    expect(s.perm("sourceEgg").topCard.instanceId).toBe(betamonId);
    expect(s.state.memory).toBe(3);
  });

  it("publicly evolves the legal Betamon host into BT23-018 before the attack window", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT23-002", as: "sourceEgg" },
        hand: [
          { card: "BT23-017", as: "betamon" },
          { card: "BT23-018", as: "garurumon" },
        ],
      },
    });
    s.state.memory = 3;
    const sourceId = s.inst("sourceEgg").instanceId;
    const betamonId = s.inst("betamon").instanceId;
    const garurumonId = s.inst("garurumon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceEgg").permanentId,
        instanceId: betamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceEgg").topCard.instanceId === betamonId);
    expect(s.perm("sourceEgg").stack[0]!.instanceId).toBe(sourceId);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceEgg").permanentId,
        instanceId: garurumonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceEgg").topCard.instanceId === garurumonId);
    expect(s.perm("sourceEgg").stack.map((card) => card.instanceId)).toEqual([sourceId, betamonId]);
    expect(s.perm("sourceEgg").topCard.instanceId).toBe(garurumonId);
    expect(s.state.memory).toBe(1);
  });

  it("plays a cost-5 Hudie, locks digivolution, and deletes it only at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-050", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
    );
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooExpensive").instanceId);
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === played!.permanentId)).toBe(
      true,
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === played!.permanentId)).toBe(
      false,
    );
  });

  it("digivolves for 0 from an off-color level-2 CS card and rejects a non-CS card", async () => {
    const legal = setupEngine({
      0: { breeding: { card: "BT23-002", as: "base" }, hand: [{ card: "BT23-017", as: "betamon" }], deck: ["BT1-009"] },
    });
    const sourceId = legal.inst("base").instanceId;
    const betamonId = legal.inst("betamon").instanceId;
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: betamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === betamonId);
    expect(legal.perm("base").stack[0]!.instanceId).toBe(sourceId);
    expect(legal.perm("base").topCard.instanceId).toBe(betamonId);
    expect(legal.state.memory).toBe(3);
    const illegal = setupEngine({
      0: { breeding: { card: "BT1-007", as: "base" }, hand: [{ card: "BT23-017", as: "betamon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("betamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("caps the inherited attack play per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", under: ["BT23-017"], as: "host" }],
          hand: [
            { card: "BT23-050", as: "firstHudie" },
            { card: "BT23-050", as: "secondHudie" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstHudie").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstHudie").instanceId)).toBe(
      true,
    );
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondHudie").instanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondHudie").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondHudie").instanceId)).toBe(
      true,
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
