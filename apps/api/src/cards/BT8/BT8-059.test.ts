import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-059.js";
import "./BT8-081.js";
import "../BT4/BT4-011.js";
import "../BT7/BT7-110.js";
import "../BT10/BT10-067.js";
import "../BT12/BT12-092.js";
import "../BT13/BT13-018.js";
import "../BT13/BT13-020.js";
import "../EX2/EX2-038.js";
import "../EX2/EX2-062.js";
import "../EX13/EX13-016.js";
import "../LM/LM-015.js";

describe("BT8-059 Kokuwamon", () => {
  it("prevents the opponent from ignoring digivolution requirements", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }], security: ["BT8-035"] },
        1: {
          battleArea: [{ card: "BT8-081", as: "fury" }],
          hand: [{ card: "BT7-040", as: "rasenmon" }],
          security: ["BT8-034"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("fury").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("fury").topCard.cardId).toBe("BT8-081");
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("rasenmon").instanceId)).toBe(true);
  });

  it("also prevents its owner from ignoring digivolution requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-059", as: "kokuwamon" },
            { card: "BT8-081", as: "fury" },
          ],
          hand: [{ card: "BT7-040", as: "rasenmon" }],
          security: ["BT8-034"],
        },
        1: { security: ["BT8-035"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fury").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.perm("fury").topCard.cardId).toBe("BT8-081");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rasenmon").instanceId)).toBe(true);
  });
});

describe("BT8-059 Kokuwamon — KB Q&A rulings", () => {
  const attackWithFuryMode = async (kokuwamonSeat: Seat | undefined) => {
    const kokuwamon = [{ card: "BT8-059", as: "kokuwamon" }];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-081", as: "fury" }, ...(kokuwamonSeat === 0 ? kokuwamon : [])],
          hand: [{ card: "BT7-040", as: "rasenmon" }],
          security: ["BT8-034"],
        },
        1: { battleArea: kokuwamonSeat === 1 ? kokuwamon : [], security: ["BT8-035"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fury").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    return s.perm("fury").topCard.cardId;
  };

  const playEvolutionAncient = async (withOpponentKokuwamon: boolean) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-021", as: "kumamon" }],
          hand: [
            { card: "BT7-110", as: "option" },
            { card: "BT7-030", as: "ancient" },
          ],
        },
        1: { battleArea: withOpponentKokuwamon ? [{ card: "BT8-059", as: "kokuwamon" }] : [] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    return s;
  };

  const attackWithCriticalArm = async (withOpponentKokuwamon: boolean) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-067", as: "criticalArm" },
            { card: "EX2-062", as: "tamer" },
          ],
          hand: [{ card: "EX2-038", as: "blitzArm" }],
        },
        1: {
          battleArea: withOpponentKokuwamon ? [{ card: "BT8-059", as: "kokuwamon" }] : [],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("criticalArm").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    return s;
  };

  it("stops both players from ignoring digivolution requirements (Q1738)", async () => {
    expect(await attackWithFuryMode(undefined)).toBe("BT7-040");
    expect(await attackWithFuryMode(0)).toBe("BT8-081");
    expect(await attackWithFuryMode(1)).toBe("BT8-081");
  });

  it("still allows DNA digivolution and Burst Digivolve (Q1739)", async () => {
    const dna = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "warGreymon" },
            { card: "BT1-044", as: "metalGarurumon" },
          ],
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }], deck: Array(8).fill("BT1-011") },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    dna.state.memory = 2;
    await dna.ready();
    expect(dna.engine.continuous.cannotIgnoreDigivolution(0)).toBe(true);
    expect(
      dna.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [dna.perm("warGreymon").permanentId, dna.perm("metalGarurumon").permanentId],
        instanceId: dna.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => dna.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX13-016"));
    expect(dna.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-016"]);

    const burst = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shineGreymon" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-020", as: "burstMode" }],
        },
        1: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    burst.state.memory = 10;
    await burst.ready();
    expect(burst.engine.continuous.cannotIgnoreDigivolution(0)).toBe(true);
    const marcusInstanceId = burst.perm("marcus").topCard.instanceId;
    expect(
      burst.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: burst.perm("shineGreymon").permanentId,
        instanceId: burst.inst("burstMode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => burst.perm("shineGreymon").topCard.cardId === "BT13-020");
    expect(burst.perm("shineGreymon").topCard.cardId).toBe("BT13-020");
    expect(burst.state.players[0]!.hand.some(({ instanceId }) => instanceId === marcusInstanceId)).toBe(true);
  });

  it("still allows digivolving without paying the cost when requirements are met (Q1740)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-015", as: "ryudamon" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [{ card: "BT15-058", as: "ginryumon" }],
        },
        1: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }], security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.continuous.cannotIgnoreDigivolution(0)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ryudamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard.cardId === "BT15-058");
    expect(s.perm("ryudamon").topCard.cardId).toBe("BT15-058");
    expect(s.state.memory).toBe(0);
  });

  it("blocks effects that ignore only part of the requirements, such as level (Q1741)", async () => {
    const control = await playEvolutionAncient(false);
    expect(control.perm("kumamon").topCard.instanceId).toBe(control.inst("ancient").instanceId);

    const s = await playEvolutionAncient(true);
    expect(s.perm("kumamon").topCard.cardId).toBe("BT7-021");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("ancient").instanceId)).toBe(true);
  });

  it("blocks Justimon: Critical Arm's [When Attacking] digivolution that ignores requirements (Q1742)", async () => {
    const control = await attackWithCriticalArm(false);
    expect(control.perm("criticalArm").topCard.instanceId).toBe(control.inst("blitzArm").instanceId);

    const s = await attackWithCriticalArm(true);
    expect(s.perm("criticalArm").topCard.cardId).toBe("BT10-067");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("blitzArm").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("still allows Agunimon to digivolve onto a red Tamer as if it were level 3 (Q1743)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "agunimon" }],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.continuous.cannotIgnoreDigivolution(0)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "BT4-011");
    expect(s.perm("tamer").topCard.cardId).toBe("BT4-011");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT1-085"]);
    expect(s.state.memory).toBe(1);
  });
});
