import { describe, expect, it } from "vitest";
import { getCardDefinition, type Permanent } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

function hand(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.hand.map((card) => card.cardId).sort();
}

function security(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.security.map((card) => card.cardId);
}

function permanentIds(s: EngineSetup, seat: 0 | 1): (string | undefined)[] {
  return s.state.players[seat]!.battleArea.map((permanent: Permanent) => permanent.topCard?.cardId);
}

describe("BT19-100 D-Reaper Zone — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-100")).toMatchObject({
      cardId: "BT19-100",
      nameEn: "D-Reaper Zone",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      forms: ["D-Reaper"],
      maxCountInDeck: 4,
    });
    const definition = getCardDefinition("BT19-100")!;
    expect(definition.effectText).toContain("\u00a0");
    expect(definition.securityEffectText).toContain("\u00a0");
    expect(definition.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Security] [Opponent's Turn] When an opponent's Digimon attacks, if all of your Digimon and Tamers have the [D-Reaper] trait, for each of 1 of your [Mother D-Reaper]'s digivolution cards, the attacking Digimon get -1000 DP for the turn.\n[Main] If you have no face-up security cards, by trashing your top security card, place this card face up as your top security card.",
    );
    expect(definition.securityEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[Security] You may play 1 [D-Reaper] trait card with a play cost equal to or lower than the number of digivolution cards of 1 of your [Mother D-Reaper]'s from your hand without paying the cost.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-100");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isSecurity: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            fireCondition: {
              kind: "allYoursMatchFilter",
              filter: {
                kind: ["Digimon", "Tamer"],
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
            },
            actions: [
              {
                kind: "ModifyDP",
                target: { sourceRef: "triggerSubject", count: 1 },
                amount: -1000,
                duration: "forTheTurn",
                scaling: {
                  per: 1,
                  unit: "digivolutionCardsOfFiltered",
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }] },
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            faceUp: true,
            source: { isSelf: true },
            condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } },
            cost: { kind: "trash", target: { filter: { zone: "security" }, count: 1 } },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                controller: "mine",
                playCostLte: 0,
                playCostLteScaling: {
                  per: 1,
                  unit: "digivolutionCardsOfFiltered",
                  filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }] },
                },
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
            },
          },
        ],
      },
    ]);
  });
});

function attackBoard(opts: {
  underMother?: string[];
  extraDefenderCards?: string[];
  zoneFaceUp?: boolean;
  breedingPeer?: string;
  decline?: boolean;
}) {
  const attackerDp: number[] = [];
  let handle: EngineSetup | undefined;
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-024", as: "attacker" },
          { card: "BT1-024", as: "bystander" },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: opts.underMother ?? ["BT1-009", "BT1-013"] },
          { card: "EX2-051", as: "wall", dp: 9000, suspended: true },
          ...(opts.extraDefenderCards ?? []).map((card, index) => ({ card, as: `extra${index}` })),
        ],
        ...(opts.breedingPeer === undefined ? {} : { breeding: { card: opts.breedingPeer, as: "breedingPeer" } }),
        hand: [{ card: "BT1-009", as: "defenderSpare" }],
        deck: [...FILLER],
        security: [{ card: "BT19-100", as: "zone", faceUp: opts.zoneFaceUp ?? true }, "BT1-013", "BT1-009"],
      },
    },
    {
      ...(opts.decline === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true }),
      autoSelectCards: true,
      onEvent: () => {
        const attacker = handle?.state.players[0]!.battleArea.find(
          (permanent) => permanent.topCard?.cardId === "BT1-024",
        );
        if (attacker !== undefined) attackerDp.push(attacker.currentDP);
      },
    },
  );
  handle = s;
  return { s, attackerDp };
}

describe("BT19-100 D-Reaper Zone — [Security][Opponent's Turn] scaled attacker debuff", () => {
  it("gives the attacking Digimon -1000 per digivolution card of a [Mother D-Reaper] and spares the bystander", async () => {
    const { s, attackerDp } = attackBoard({});
    await s.ready();
    const bystanderDp = s.perm("bystander").currentDP;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-024"));

    expect(Math.min(...attackerDp)).toBe(8000);
    expect(permanentIds(s, 0)).toEqual(["BT1-024"]);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).not.toBe(attackerId);
    expect(s.perm("wall").topCard!.cardId).toBe("EX2-051");
    expect(s.perm("bystander").currentDP).toBe(bystanderDp);
    expect(security(s, 1)).toEqual(["BT19-100", "BT1-013", "BT1-009"]);
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("scales with the digivolution-card count: 5 cards is -5000, 0 cards is no change", async () => {
    const five = attackBoard({ underMother: ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"] });
    await five.s.ready();
    expect(
      five.s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: five.s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: five.s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => five.s.state.players[0]!.trash.some((card) => card.cardId === "BT1-024"));
    expect(Math.min(...five.attackerDp)).toBe(5000);

    const none = attackBoard({ underMother: [] });
    await none.s.ready();
    const wallId = none.s.perm("wall").permanentId;
    expect(
      none.s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: none.s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: wallId },
      }),
    ).toEqual({ ok: true });
    await settle(() => none.s.state.players[1]!.trash.some((card) => card.cardId === "EX2-051"));
    expect(Math.min(...none.attackerDp)).toBe(10000);
    expect(none.s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === wallId)).toBe(false);
  });

  it("does not fire while a Tamer without the [D-Reaper] trait is in the battle area (Q3176)", async () => {
    const { s, attackerDp } = attackBoard({ extraDefenderCards: ["BT19-087"] });
    await s.ready();
    const wallId = s.perm("wall").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: wallId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX2-051"));

    expect(Math.min(...attackerDp)).toBe(10000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === wallId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("still fires while a non-[D-Reaper] Digimon sits in the BREEDING area (Q3177)", async () => {
    const { s, attackerDp } = attackBoard({ breedingPeer: "BT1-012" });
    await s.ready();
    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT1-012");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-024"));

    expect(Math.min(...attackerDp)).toBe(8000);
    expect(s.perm("wall").topCard!.cardId).toBe("EX2-051");
  });

  it("activates even when every optional prompt is declined (Q3181)", async () => {
    const { s, attackerDp } = attackBoard({ decline: true });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-024"));

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(Math.min(...attackerDp)).toBe(8000);
    expect(s.perm("wall").topCard!.cardId).toBe("EX2-051");
  });

  it("stays silent while the card is FACE DOWN in security (comprehensive 15-14-5-1)", async () => {
    const { s, attackerDp } = attackBoard({ zoneFaceUp: false });
    await s.ready();
    const wallId = s.perm("wall").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: wallId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX2-051"));

    expect(Math.min(...attackerDp)).toBe(10000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === wallId)).toBe(false);
  });
});

function mainBoard(opts: { faceUpSecurity?: boolean; whiteOnBoard?: boolean; decline?: boolean }) {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: opts.whiteOnBoard === false ? "BT1-024" : "EX2-051", as: "colorSource" }],
        hand: [
          { card: "BT19-100", as: "zone" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: [...FILLER],
        security: [
          { card: "BT1-013", as: "topSecurity", faceUp: opts.faceUpSecurity ?? false },
          { card: "BT1-009", as: "secondSecurity" },
        ],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    },
    {
      ...(opts.decline === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true }),
      autoSelectCards: true,
    },
  );
}

describe("BT19-100 D-Reaper Zone — [Main] face-up security placement", () => {
  it("trashes the top security card and places itself face up on top of the stack", async () => {
    const s = mainBoard({});
    s.state.memory = 10;
    await s.ready();
    const trashedId = s.inst("topSecurity").instanceId;
    const zoneId = s.inst("zone").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: zoneId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === zoneId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      zoneId,
      s.inst("secondSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([trashedId]);
    expect(s.state.memory).toBe(7);
    expect(hand(s, 0)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate while a face-up security card already exists, and the Option is trashed (Q3179)", async () => {
    const s = mainBoard({ faceUpSecurity: true });
    s.state.memory = 10;
    await s.ready();
    const zoneId = s.inst("zone").instanceId;
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: zoneId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === zoneId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([zoneId]);
    expect(s.state.memory).toBe(7);
  });

  it("leaves the whole clause unpaid when its 'by trashing' cost is declined", async () => {
    const s = mainBoard({ decline: true });
    s.state.memory = 10;
    await s.ready();
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zone").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-100"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-100"]);
  });

  it("refuses the play with no White permanent on the board and accepts it with one", async () => {
    const noWhite = mainBoard({ whiteOnBoard: false });
    noWhite.state.memory = 10;
    await noWhite.ready();
    expect(noWhite.engine.applyIntent(0, { type: "playCard", instanceId: noWhite.inst("zone").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(noWhite.state.memory).toBe(10);
    expect(hand(noWhite, 0)).toEqual(["BT1-009", "BT19-100"]);

    const white = mainBoard({});
    white.state.memory = 10;
    await white.ready();
    expect(white.engine.applyIntent(0, { type: "playCard", instanceId: white.inst("zone").instanceId })).toEqual({
      ok: true,
    });
  });
});

function securityCheckBoard(opts: { underMother: string[]; zoneFaceUp?: boolean; decline?: boolean }) {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: {
        battleArea: [{ card: "EX2-007", as: "mother", under: opts.underMother }],
        hand: [
          { card: "EX2-051", as: "eligible" },
          { card: "EX2-054", as: "costMiss" },
          { card: "BT1-012", as: "traitMiss" },
        ],
        deck: [...FILLER],
        security: [{ card: "BT19-100", as: "zone", faceUp: opts.zoneFaceUp ?? false }, "BT1-009"],
      },
    },
    {
      ...(opts.decline === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true }),
      autoSelectCards: true,
    },
  );
}

describe("BT19-100 D-Reaper Zone — [Security] free play scaled by digivolution cards", () => {
  const SIX_UNDER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function attackPlayer(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
  }

  it("plays a [D-Reaper] card whose cost fits the digivolution-card count, for free", async () => {
    const s = securityCheckBoard({ underMother: SIX_UNDER });
    s.state.memory = 3;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-100"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(hand(s, 1)).toEqual(["BT1-012", "EX2-054"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(security(s, 1)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is declinable: the printed 'You may play' leaves every card in hand", async () => {
    const s = securityCheckBoard({ underMother: SIX_UNDER, decline: true });
    s.state.memory = 3;
    await s.ready();

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-100"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(hand(s, 1)).toEqual(["BT1-012", "EX2-051", "EX2-054"]);
    expect(permanentIds(s, 1)).toEqual(["EX2-007"]);
  });

  it("triggers its [Security] skill on a real check whether the card was face down or FACE UP (Q3182/Q3183)", async () => {
    for (const zoneFaceUp of [false, true]) {
      const s = securityCheckBoard({ underMother: SIX_UNDER, zoneFaceUp });
      s.state.memory = 3;
      await s.ready();
      expect(s.state.players[1]!.security[0]!.faceUp).toBe(zoneFaceUp);

      expect(attackPlayer(s)).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-100"));

      const revealed = s.events.find(
        (event) => event.kind === "securityRevealed" && event.revealedCardId === "BT19-100",
      );
      expect(revealed).toMatchObject({ kind: "securityRevealed", hasSecurityEffect: true, isDigimon: false });
      expect(security(s, 1)).toEqual(["BT1-009"]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-100"]);
    }
  });

  it("plays nothing when every [D-Reaper] card in hand costs more than the digivolution-card count", async () => {
    const s = securityCheckBoard({ underMother: ["BT1-009", "BT1-013"] });
    s.state.memory = 3;
    await s.ready();

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-100"));

    expect(hand(s, 1)).toEqual(["BT1-012", "EX2-051", "EX2-054"]);
    expect(permanentIds(s, 1)).toEqual(["EX2-007"]);
  });
});
