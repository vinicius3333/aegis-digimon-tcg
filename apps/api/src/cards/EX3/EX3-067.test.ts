import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-067.js";

describe("EX3-067 Sourai", () => {
  it("matches the official blue Option identity and complete Main/Security text", () => {
    const definition = getCardDefinition("EX3-067")!;
    expect(definition).toMatchObject({
      cardId: "EX3-067",
      nameEn: "Sourai",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 4,
      rarity: "U",
      imageId: "EX3-067",
    });
    expect(definition.effectText).toContain("Trash the top 4 digivolution cards");
    expect(definition.effectText).toContain("all of your opponent's Digimon with no digivolution cards can't attack");
    expect(definition.securityEffectText).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("trashes exactly the top 4 sources from the chosen opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "blueSource" }],
        hand: [{ card: "EX3-067", as: "sourai" }],
      },
      1: {
        battleArea: [
          { card: "BT1-025", under: ["BT1-001", "BT1-009", "BT1-015", "BT1-020", "BT1-021"], as: "chosen" },
          { card: "BT1-026", under: ["BT1-002", "BT1-010"], as: "untouched" },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision).toMatchObject({
      sourceCardId: "EX3-067",
      kind: "chooseTargets",
      options: {
        candidateInstanceIds: [s.perm("chosen").permanentId, s.perm("untouched").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(decision.options?.effectText).toContain("Trash the top 4 digivolution cards");
    expect(decision.options?.effectText).toContain("with no digivolution cards can't attack");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-067"));

    expect(s.perm("chosen").stack.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.perm("untouched").stack.map(({ cardId }) => cardId)).toEqual(["BT1-002", "BT1-010"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-015", "BT1-020", "BT1-021"]),
    );
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-001");
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attack")).toBe(false);
    assertNoLoudGap(s);
  });

  it("blue source-control family: strips all available sources and locks every source-less opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "blueSource" }],
          hand: [{ card: "EX3-067", as: "sourai" }],
        },
        1: {
          battleArea: [
            { card: "BT1-025", under: ["BT1-001", "BT1-009", "BT1-015"], as: "stripped" },
            { card: "BT1-028", as: "alreadyEmpty" },
            { card: "BT1-026", under: ["BT1-002"], as: "stillLoaded" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stripped").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("stripped"), "attack"));

    expect(s.perm("stripped").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("stripped"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("alreadyEmpty"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stillLoaded"), "attack")).toBe(false);
    assertNoLoudGap(s);
  });

  it("with no source-bearing target, skips the first selection but still locks all source-less Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "blueSource" }],
        hand: [{ card: "EX3-067", as: "sourai" }],
      },
      1: { battleArea: [{ card: "BT1-029", as: "empty" }] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("empty"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-067" && req.kind === "chooseTargets"),
    ).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("prevents the affected Digimon from attacking on the opponent's turn and expires at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "blueSource" }],
          hand: [{ card: "EX3-067", as: "sourai" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT1-029", as: "locked" }],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "attack"));

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "attack")).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not satisfy its blue color requirement without an own blue Digimon or Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX3-067", as: "sourai" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourai").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("Security activates the same Main sequence without paying cost or meeting color", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX3-067", faceUp: true, as: "securitySourai" }] },
        1: { battleArea: [{ card: "BT1-025", under: ["BT1-001", "BT1-009"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securitySourai"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
