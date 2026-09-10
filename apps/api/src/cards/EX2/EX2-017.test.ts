import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-017.js";
import "./EX2-059.js";

describe("EX2-017 Leomon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("EX2-017")).toMatchObject({
      cardId: "EX2-017",
      nameEn: "Leomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText:
        "[Opponent's Turn] While you have a Tamer in play, this Digimon gains ＜Blocker＞. (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)[On Deletion] Gain 2 memory and ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
              while: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
                raw: "you have a Tamer in play",
              },
            },
          ],
        },
        {
          trigger: "OnDeletion",
          actions: [
            { kind: "GainMemory", amount: 2 },
            { kind: "Draw", controller: "mine", amount: 1 },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 2 memory and draws 1 when deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-017", as: "leomon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, suspended: true, as: "defender" }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.memory === 5 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX2-017")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("can block an opponent attack during the opponent's turn while a Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-017", as: "leomon" },
            { card: "EX2-059", as: "tamer" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(false);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("leomon").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("leomon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not gain Blocker during the opponent's turn without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-017", as: "leomon" }] },
      1: { deck: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(false);
  });

  it("retains the Tamer-gated Blocker through a legal blue level-3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-013", as: "base" },
          { card: "EX2-059", as: "tamer" },
        ],
        hand: [{ card: "EX2-017", as: "evolution" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolution").instanceId);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX2-017");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-013"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("rejects evolution from a non-blue level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX2-017", as: "evolution" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
