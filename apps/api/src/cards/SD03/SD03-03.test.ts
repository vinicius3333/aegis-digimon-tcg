import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-03";

const cardId = "SD03-03";
const alysionHost = "BD06-05";
const vegetationHost = "BT1-065";
const securityDigimon = "BT1-010";
const attackerCard = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;
type BoardParams = { suspended: boolean; autoDeclineOptional?: boolean };

function setupDefendingElfmon({ suspended, autoDeclineOptional }: BoardParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "elfmon", suspended }],
        security: [securityDigimon, securityDigimon],
      },
      1: {
        battleArea: [
          { card: attackerCard, dp: 1000, as: "firstAttacker" },
          { card: attackerCard, dp: 1000, as: "secondAttacker" },
        ],
      },
    },
    autoDeclineOptional === true
      ? { autoDeclineOptional: true, autoSelectCards: true }
      : { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  return s;
}

function attackPlayer(s: Harness, alias: string) {
  return s.engine.applyIntent(1, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

function isOnOpponentBoard(s: Harness, permanentId: string) {
  return s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === permanentId);
}

describe("SD03-03 Elfmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Elfmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Fairy", "ALYSION"],
      effectText:
        "[Opponent's Turn][Once Per Turn] When your opponent's Digimon attacks, you may change the attack target to this suspended Digimon.",
      inheritedEffectText: "[All Turns] This suspended Digimon with the [ALYSION] trait gets +1000 DP.",
    });
  });

  it("compiles a suspended-only once-per-turn redirect and the inherited suspended ALYSION aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            fireCondition: { kind: "selfIsSuspended" },
            actions: [{ kind: "RedirectAttack", target: { isSelf: true }, optional: true }],
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{ kind: "Aura", target: { isSelf: true }, effect: { kind: "modifyDP", amount: 1000 } }],
      },
    ]);
  });

  it("redirects an attack on the player to the suspended Elfmon, once per turn", async () => {
    const s = setupDefendingElfmon({ suspended: true });
    await s.ready();
    const firstAttackerId = s.perm("firstAttacker").permanentId;

    expect(attackPlayer(s, "firstAttacker")).toEqual({ ok: true });
    await settle(() => !isOnOpponentBoard(s, firstAttackerId));
    await drainMicrotasks(20);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("elfmon").isSuspended).toBe(true);

    expect(attackPlayer(s, "secondAttacker")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    assertNoLoudGap(s);
  });

  it("lets the attack proceed when the redirect is declined", async () => {
    const s = setupDefendingElfmon({ suspended: true, autoDeclineOptional: true });
    await s.ready();

    expect(attackPlayer(s, "firstAttacker")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
  });

  it("does not redirect while unsuspended and keeps the once-per-turn use for after it suspends", async () => {
    const s = setupDefendingElfmon({ suspended: false });
    await s.ready();
    const secondAttackerId = s.perm("secondAttacker").permanentId;

    expect(attackPlayer(s, "firstAttacker")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    await drainMicrotasks(20);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);

    await advance(s.engine).verb.suspend([s.perm("elfmon").permanentId]);
    expect(attackPlayer(s, "secondAttacker")).toEqual({ ok: true });
    await settle(() => !isOnOpponentBoard(s, secondAttackerId));
    await drainMicrotasks(20);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("gives +1000 DP only to a suspended ALYSION host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId] },
          { card: alysionHost, as: "activeAlysion", under: [cardId] },
          { card: vegetationHost, as: "suspendedVegetation", suspended: true, under: [cardId] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(8000);
    expect(s.perm("activeAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedVegetation").currentDP).toBe(4000);
  });
});
