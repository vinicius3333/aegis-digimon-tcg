import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-017.js";

describe("EX8-017", () => {
  it("matches the catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-017")).toMatchObject({
      cardId: "EX8-017",
      nameEn: "Crabmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Crustacean", "DS"],
      effectText: expect.stringContaining(
        "[On Play] 1 of your Digimon gains ＜Blocker＞until the end of your opponent's turn.",
      ),
      inheritedEffectText: "＜Jamming＞.",
    });
  });
  it("traces the On Play Blocker grant, duration, scope, and inherited Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toEqual([
      {
        keyword: "Jamming",
        raw: "＜Jamming＞",
      },
    ]);
  });
  it("gives a live friendly Digimon Blocker on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-017", as: "crabmon" }], battleArea: [{ card: "AD1-001", as: "target" }] },
        1: { deck: ["BT1-045"], battleArea: [{ card: "AD1-001", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Blocker")).toBe(false);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
  });
  it("exposes inherited Jamming on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "host", under: [{ card: "EX8-017", as: "crabmon" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("survives a losing security battle through inherited Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-037", dp: 1000, as: "attacker", under: ["EX8-017"] }] },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  });

  it("uses the granted Blocker window to intercept an opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-017", as: "crabmon" }],
          battleArea: [{ card: "BT1-037", dp: 6000, as: "blocker" }],
          security: ["BT1-045"],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker"));

    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses the level-2 DS route for 0 and rejects a level-2 non-DS base", async () => {
    expect(digivolutionRequirementsFor("EX8-017")).toContainEqual({
      level: 2,
      traits: ["DS"],
      cost: 0,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { breeding: { card: "EX8-002", as: "bukamon" }, hand: [{ card: "EX8-017", as: "crabmon" }] },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("bukamon").permanentId,
        instanceId: eligible.inst("crabmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("bukamon").topCard.instanceId === eligible.inst("crabmon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const standard = setupEngine({
      0: { breeding: { card: "BT2-002", as: "blueEgg" }, hand: [{ card: "EX8-017", as: "crabmon" }] },
    });
    standard.state.memory = 0;
    await standard.ready();
    expect(
      standard.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: standard.perm("blueEgg").permanentId,
        instanceId: standard.inst("crabmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => standard.perm("blueEgg").topCard.instanceId === standard.inst("crabmon").instanceId);
    expect(standard.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "kapurimon" }, hand: [{ card: "EX8-017", as: "crabmon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("kapurimon").permanentId,
        instanceId: ineligible.inst("crabmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
