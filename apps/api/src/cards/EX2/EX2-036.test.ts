import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-036.js";
import "./EX2-036.js";
import "./EX2-031.js";
import "./EX2-034.js";
import "./EX2-014.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-012.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-014.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-036 GroundLocomon", () => {
  it("matches the catalog and compiled IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-036")).toMatchObject({
      cardId: "EX2-036",
      nameEn: "GroundLocomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Machine"],
      effectText:
        "[Your Turn] This Digimon can't attack your opponent's Digimon.[All Turns] For each card in your trash with [Cyborg] or [Machine] in its traits, this Digimon gets +1000 DP.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Restrict",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              restriction: "cantAttackDigimon",
              duration: "permanent",
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "permanent",
              scaling: {
                per: 1,
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
                },
                unit: "trash",
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("can attack players and gains 1000 DP per Cyborg or Machine in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034", "EX2-014"] },
      1: { security: inertSecurity },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("groundLocomon"), "cantAttackDigimon")).toBe(true);
    expect(s.perm("groundLocomon").currentDP).toBe(13000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  });

  it("can't choose an opponent's suspended Digimon as its attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }] },
      1: { battleArea: [{ card: "EX2-031", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("battles normally when its player attack is blocked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-036", as: "groundLocomon" }],
          deck: ["BT1-011", "BT1-012"],
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "EX2-031", as: "blocker" }],
          deck: ["BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("groundLocomon").currentDP).toBe(11000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps its trash-based DP bonus on the opponent's turn but only restricts attacks on its own turn", async () => {
    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034"] },
      1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014"], security: inertSecurity },
    });
    await opponentTurn.ready();
    const turnLoop = opponentTurn.engine.startTurnLoop();
    await advance(opponentTurn.engine).waitForMainPhase(0);
    advance(opponentTurn.engine).endMainPhaseIfOpen(0);
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(opponentTurn.perm("groundLocomon").currentDP).toBe(13000);
    expect(observe(opponentTurn.engine).isRestricted(opponentTurn.perm("groundLocomon"), "cantAttackDigimon")).toBe(
      false,
    );
    expect(opponentTurn.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;

    const ownTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034"] },
      1: { deck: ["BT1-013", "BT1-014"], security: inertSecurity },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("groundLocomon").currentDP).toBe(13000);
    expect(observe(ownTurn.engine).isRestricted(ownTurn.perm("groundLocomon"), "cantAttackDigimon")).toBe(true);
  });

  it("retains the attack restriction and trash DP scaling after legal black evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-034", as: "base" }],
        hand: [{ card: "EX2-036", as: "evolution" }],
        trash: ["EX2-031", "EX2-034", "EX2-014"],
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
    await settle(() => s.perm("base").topCard.cardId === "EX2-036");
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-034"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantAttackDigimon")).toBe(true);
  });

  it("rejects evolution from a non-black source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-036", as: "evolution" }],
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
