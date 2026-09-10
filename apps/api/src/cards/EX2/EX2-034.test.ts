import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-034.js";
import "./EX2-034.js";
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

describe("EX2-034 Andromon", () => {
  it("matches the catalog and compiled IR for Blocker and the opponent-turn aura", () => {
    expect(getCardDefinition("EX2-034")).toMatchObject({
      cardId: "EX2-034",
      nameEn: "Andromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 6000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      effectText:
        "＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)[Opponent's Turn] All of your Digimon with ＜Blocker＞ get +2000 DP.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], keywords: ["Blocker"] },
                count: "all",
              },
              amount: 2000,
              duration: "permanent",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-034", as: "andromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("andromon"), "Blocker")).toBe(true);
  });

  it("gives all your Blockers +2000 DP only during the opponent's turn", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
          { card: "EX2-030", as: "nonBlocker" },
        ],
        deck: ["BT1-011"],
        security: inertSecurity,
      },
      1: { deck: ["BT1-012"], security: inertSecurity },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("andromon").currentDP).toBe(6000);
    expect(ownTurn.perm("guardromon").currentDP).toBe(4000);
    expect(ownTurn.perm("nonBlocker").currentDP).toBe(1000);

    const opponentsTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
          { card: "EX2-030", as: "nonBlocker" },
        ],
        deck: ["BT1-011"],
        security: inertSecurity,
      },
      1: { deck: ["BT1-012"], security: inertSecurity },
    });
    opponentsTurn.state.turnSeat = 1;
    await opponentsTurn.ready();
    expect(opponentsTurn.perm("andromon").currentDP).toBe(8000);
    expect(opponentsTurn.perm("guardromon").currentDP).toBe(6000);
    expect(opponentsTurn.perm("nonBlocker").currentDP).toBe(1000);
  });

  it("materializes the Blocker aura after a production turn transition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
        ],
        deck: ["BT1-011", "BT1-012"],
        security: inertSecurity,
      },
      1: { deck: ["BT1-013", "BT1-014"], hand: ["BT1-009"], security: inertSecurity },
    });
    await s.ready();

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.turnSeat).toBe(1);
    await settle(() => s.perm("andromon").currentDP === 8000);
    expect(s.perm("andromon").currentDP).toBe(8000);
    expect(s.perm("guardromon").currentDP).toBe(6000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("publicly redirects an opponent attack through Andromon's Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-034", as: "andromon" }],
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
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("andromon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("andromon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("retains Blocker after a legal black level-4 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "base" }],
          hand: [{ card: "EX2-034", as: "evolution" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
        1: { deck: ["BT1-011", "BT1-012"], security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-034");
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-031"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("rejects evolution from a non-black source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-034", as: "evolution" }],
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
