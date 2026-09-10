import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-031.js";
import "./EX2-031.js";
import "./EX2-030.js";
import "./EX2-014.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-012.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-014.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-031 Guardromon", () => {
  it("matches the catalog and compiled IR for Blocker and its On Play buff", () => {
    expect(getCardDefinition("EX2-031")).toMatchObject({
      cardId: "EX2-031",
      nameEn: "Guardromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Machine"],
      effectText:
        "＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)[On Play] 1 of your Digimon gets +3000 DP until the end of your opponent's turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              amount: 3000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Blocker and gives one of its Digimon +3000 DP on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-030", as: "ally" }], hand: [{ card: "EX2-031", as: "guardromon" }] } },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 4000);
    expect(s.perm("ally").currentDP).toBe(4000);
    const guardromon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX2-031")!;
    expect(observe(s.engine).hasKeyword(guardromon, "Blocker")).toBe(true);
  });

  it("publicly redirects an opponent attack through its Blocker keyword", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "guardromon" }],
          deck: ["BT1-011", "BT1-012"],
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("guardromon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("guardromon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("keeps the +3000 DP through the opponent's turn, then expires at its end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "ally" }],
          hand: [{ card: "EX2-031", as: "guardromon" }],
          deck: ["BT1-011", "BT1-012"],
          security: inertSecurity,
        },
        1: { deck: ["BT1-013", "BT1-014"], security: inertSecurity },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 4000);
    expect(s.perm("ally").currentDP).toBe(4000);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("ally").currentDP).toBe(4000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ally").currentDP).toBe(1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("retains Blocker after a legal black level-3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-030", as: "base" }],
        hand: [{ card: "EX2-031", as: "evolution" }],
        deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-031");
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-030"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("rejects evolution from a non-black source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-031", as: "evolution" }],
        deck: ["BT1-011", "BT1-012"],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("blueSource").topCard.cardId).toBe("EX2-014");
    expect(s.state.memory).toBe(10);
  });
});
