import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import "../BT1/BT1-062.js";

/** The four DigiXros partners EX6-023..026 name for each other, keyed by card id. */
export const JOURNEY_WEST = {
  Gokuumon: "EX6-023",
  Sagomon: "EX6-024",
  Sanzomon: "EX6-025",
  "Cho-Hakkaimon": "EX6-026",
} as const;

const SHAKAMON = "EX6-031";

function onBoard(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
}

/** Play `cardId` from hand declaring every other listed partner as DigiXros material at once. */
export async function declareEveryPartnerAsMaterial(cardId: string) {
  const partners = Object.values(JOURNEY_WEST).filter((partner) => partner !== cardId);
  const s = setupEngine(
    {
      0: {
        hand: [{ card: cardId, as: "played" }, ...partners.map((card, index) => ({ card, as: `partner${index}` }))],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const partnerIds = partners.map((_, index) => s.inst(`partner${index}`).instanceId);
  const playWith = (materialInstanceIds: string[]) =>
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("played").instanceId,
      digiXros: { materialInstanceIds },
    } as never);
  return { s, partnerIds, playWith };
}

export async function expectOnlyOnePartnerPlaced(cardId: string) {
  const { s, partnerIds, playWith } = await declareEveryPartnerAsMaterial(cardId);
  expect(playWith(partnerIds).ok).toBe(false);
  expect(playWith(partnerIds.slice(0, 2)).ok).toBe(false);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);

  expect(playWith(partnerIds.slice(0, 1))).toEqual({ ok: true });
  await settle(() => onBoard(s, s.inst("played").instanceId) && s.state.pendingDecision === undefined);
  const played = s.perm("played");
  expect(played.stack.map((card) => card.instanceId)).toEqual([partnerIds[0]]);
  expect(s.state.memory).toBe(5);
}

/**
 * A copy of `cardId` that entered by DigiXros (a partner already under it) attacks: only the
 * Security Attack clause resolves, never the "if DigiXrosing" tail.
 */
export async function attackAfterDigiXrosEntry(cardId: string, deck: string[]) {
  const partner = Object.values(JOURNEY_WEST).find((card) => card !== cardId)!;
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "played", under: [partner] }], deck },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }], security: ["BT1-009", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  await s.ready();
  preferred.push(s.perm("opponent").topCard!.instanceId);
  const printedDp = s.perm("played").currentDP;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("played").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBeLessThan(0);
  return { s, printedDp };
}

/** Its On Play and its inherited [When Attacking] can both give the controller's own Digimon ＜Security A. -1＞. */
export async function expectOwnDigimonCanGainSecurityMinus(cardId: string) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-009", as: "ally" },
          { card: "BT1-062", as: "host", under: ["EX6-019", cardId] },
        ],
        hand: [{ card: cardId, as: "played" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-009", "BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, declineDigiXros: true },
  );
  s.state.memory = 10;
  await s.ready();
  preferred.push(s.perm("ally").topCard!.instanceId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
  await settle(() => onBoard(s, s.inst("played").instanceId) && s.state.pendingDecision === undefined);
  expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(-1);
  expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);

  preferred.splice(0, preferred.length, s.perm("host").topCard!.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(-1);
  expect(s.state.players[1]!.security).toHaveLength(2);
}

export type LeaveRoute = "trash" | "hand" | "deck";

/** Remove `cardId` (with a yellow Digimon source) by `route`; its [All Turns] returns the source first. */
export async function leaveBattleAreaBy(cardId: string, route: LeaveRoute) {
  const s = setupEngine(
    { 0: { battleArea: [{ card: cardId, as: "leaving", under: [{ card: "EX6-019", as: "yellow" }] }] } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const leavingPermanentId = s.perm("leaving").permanentId;
  const leavingInstanceId = s.inst("leaving").instanceId;
  const verb = advance(s.engine).verb;
  if (route === "trash") await verb.deletePermanent([leavingPermanentId], "byEffect");
  if (route === "hand") await verb.returnToHand([leavingInstanceId]);
  if (route === "deck") await verb.returnToDeck([leavingInstanceId]);
  await settle(() => s.state.pendingDecision === undefined);
  const player = s.state.players[0]!;
  expect(player.battleArea).toHaveLength(0);
  expect(player.hand.map((card) => card.instanceId)).toContain(s.inst("yellow").instanceId);
  const destination = route === "trash" ? player.trash : route === "hand" ? player.hand : player.deck;
  expect(destination.map((card) => card.instanceId)).toContain(leavingInstanceId);
}

/**
 * `cardId` sits in the battle area with a yellow Digimon source and is declared, together with
 * the other partners from hand, as Shakamon's DigiXros material. Being placed under Shakamon is
 * leaving the battle area, so its [All Turns] returns the source to hand — and that card stays
 * in hand instead of joining the already-declared materials.
 */
export async function becomeShakamonMaterialFromField(cardId: string) {
  const handPartners = Object.values(JOURNEY_WEST).filter((card) => card !== cardId);
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "field", under: [{ card: "EX6-019", as: "yellow" }] }],
        hand: [
          { card: SHAKAMON, as: "shaka" },
          ...handPartners.map((card, index) => ({ card, as: `partner${index}` })),
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const materialInstanceIds = [
    s.inst("field").instanceId,
    ...handPartners.map((_, index) => s.inst(`partner${index}`).instanceId),
  ];
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("shaka").instanceId,
      digiXros: { materialInstanceIds },
    } as never),
  ).toEqual({ ok: true });
  await settle(() => onBoard(s, s.inst("shaka").instanceId) && s.state.pendingDecision === undefined);
  const yellowId = s.inst("yellow").instanceId;
  const shakamon = s.perm("shaka");
  expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(yellowId);
  expect(shakamon.stack.map((card) => card.instanceId)).not.toContain(yellowId);
  expect(new Set(shakamon.stack.map((card) => card.instanceId))).toEqual(new Set(materialInstanceIds));
  expect(s.state.players[0]!.battleArea).toHaveLength(1);
}
