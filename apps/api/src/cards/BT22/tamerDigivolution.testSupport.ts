import { EffectTiming } from "@aegis/shared";
import { expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

/** A Digimon card whose printed digivolution requirement names a Tamer. */
export interface TamerDigivolution {
  digimon: string;
  tamer: string;
  /** A Tamer card with a [Security] effect, placed under the Digimon for the security-effect ruling. */
  securityTamer: string;
}

/** Ruling ids, one per KB Q&A the shared Tamer-digivolution rulings answer. */
export interface TamerDigivolutionRulings {
  noAttackTheTurnTheTamerEntered: string;
  digivolvesAsTamer: string;
  bonusDraw: string;
  tamerIsDigivolutionCard: string;
  noSecurityEffect: string;
}

export function digivolveFromTamer(s: EngineSetup, tamerAlias = "tamer", digimonAlias = "digimon") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(digimonAlias).instanceId,
  });
}

/** Seat 0 with the Tamer on the field and the Digimon card in hand, ready to digivolve. */
export async function tamerReadyToDigivolve(
  card: TamerDigivolution,
  extra: { seat0?: SeatSpec; seat1?: SeatSpec; enteredThisTurn?: boolean; acceptOptional?: boolean } = {},
): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        deck: [...FILLER],
        ...extra.seat0,
        battleArea: [
          { card: card.tamer, as: "tamer", enteredThisTurn: extra.enteredThisTurn ?? false },
          ...(extra.seat0?.battleArea ?? []),
        ],
        hand: [{ card: card.digimon, as: "digimon" }, ...(extra.seat0?.hand ?? [])],
      },
      1: { security: ["BT1-009"], ...extra.seat1 },
    },
    extra.acceptOptional === true
      ? { autoAcceptOptional: true, autoSelectCards: true }
      : { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  return s;
}

export async function digivolveTamer(s: EngineSetup, card: TamerDigivolution): Promise<void> {
  expect(digivolveFromTamer(s)).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard.cardId === card.digimon);
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks();
}

/** The KB Q&A rulings every Digimon that digivolves from a Tamer shares. */
export function itFollowsTamerDigivolutionRulings(card: TamerDigivolution, q: TamerDigivolutionRulings): void {
  it(`cannot attack the turn it digivolves from a Tamer that entered play that turn (${q.noAttackTheTurnTheTamerEntered})`, async () => {
    const attackAfterDigivolving = async (enteredThisTurn: boolean) => {
      const s = await tamerReadyToDigivolve(card, { enteredThisTurn });
      await digivolveTamer(s, card);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "player" },
      }).ok;
    };

    expect(await attackAfterDigivolving(true)).toBe(false);
    expect(await attackAfterDigivolving(false)).toBe(true);
  });

  it(`digivolves the Tamer as-is: no "when a Digimon digivolves" trigger, and a Digimon can't-digivolve effect doesn't stop it (${q.digivolvesAsTamer})`, async () => {
    const watched = await tamerReadyToDigivolve(card, {
      acceptOptional: true,
      seat0: {
        battleArea: [
          { card: "BT1-009", as: "monodramon" },
          { card: "EX2-045", as: "calumon" },
        ],
        hand: [{ card: "BT1-015", as: "greymon" }],
      },
    });
    await digivolveTamer(watched, card);
    expect(watched.perm("calumon").isSuspended).toBe(false);

    expect(digivolveFromTamer(watched, "monodramon", "greymon")).toEqual({ ok: true });
    await settle(() => watched.perm("calumon").isSuspended);
    expect(watched.perm("calumon").isSuspended).toBe(true);

    const restricted = await tamerReadyToDigivolve(card, {
      seat0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "BT1-015", as: "greymon" }],
      },
    });
    expect(digivolveFromTamer(restricted, "monodramon", "greymon")).toMatchObject({ ok: false });
    await digivolveTamer(restricted, card);
    expect(restricted.perm("tamer").topCard.cardId).toBe(card.digimon);
  });

  it(`performs the digivolution bonus draw when the Tamer digivolves (${q.bonusDraw})`, async () => {
    const s = await tamerReadyToDigivolve(card, { seat0: { deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"] } });

    await digivolveTamer(s, card);

    expect(s.state.players[0]!.hand.map((hand) => hand.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it(`keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (${q.tamerIsDigivolutionCard})`, async () => {
    const s = await tamerReadyToDigivolve(card);
    const tamerCardId = s.perm("tamer").topCard.instanceId;
    const permanentId = s.perm("tamer").permanentId;

    await digivolveTamer(s, card);
    expect(s.perm("tamer").stack.map((under) => under.instanceId)).toEqual([tamerCardId]);

    await advance(s.engine).verb.deletePermanent([permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((trashed) => trashed.instanceId)).toContain(tamerCardId);
  });

  it(`does not gain the [Security] effect of a Tamer in its digivolution cards (${q.noSecurityEffect})`, async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: card.digimon, as: "digimon", under: [{ card: card.securityTamer, as: "tamerUnder" }, card.tamer] },
        ],
        security: [{ card: card.securityTamer, as: "tamerInSecurity" }],
      },
    });
    await s.ready();
    const tamersInPlay = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === card.securityTamer).length;

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("digimon"));
    await settle();
    expect(tamersInPlay()).toBe(0);
    expect(s.perm("digimon").stack.map((under) => under.instanceId)).toContain(s.inst("tamerUnder").instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamerInSecurity"));
    await settle(() => tamersInPlay() === 1);
    expect(tamersInPlay()).toBe(1);
  });
}
