import type { ServerEvent } from "@aegis/shared";
import { expect } from "vitest";
import { identityVisibility } from "../ST24/tamerStack.testSupport.js";
import { setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";

/**
 * An EX12 Option whose [Main] effect adds the bottom security card to the hand and places
 * the Option face up as the new bottom security card.
 */
export interface FaceUpSecurityOption {
  cardId: string;
  /** A Digimon that meets the Option's ＜Use Req.＞ trait. */
  useRequirementCard: string;
  /** A card in the checking player's hand that the Option's [Security] effect plays. */
  securityPlayCard: string;
}

/** Use the Option from seat 0's hand and wait until it sits face up at the bottom of security. */
export async function useFaceUpSecurityOption(
  option: FaceUpSecurityOption,
  security: SeatSpec["security"],
): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: option.useRequirementCard, as: "requirement" }],
        hand: [{ card: option.cardId, as: "option" }],
        security,
      },
      1: { security: ["BT1-101"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.security.at(-1)?.cardId === option.cardId, 160);
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

/** Q: can the [Main] effect be used with 0 security cards? A: yes, it only places itself. */
export async function expectUseWithEmptySecurity(option: FaceUpSecurityOption) {
  const s = await useFaceUpSecurityOption(option, []);

  expect(s.state.players[0]!.security.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
    { cardId: option.cardId, faceUp: true },
  ]);
  expect(s.state.players[0]!.hand).toHaveLength(0);
}

/**
 * Q: what happens to a card placed face up in security? A: it stays revealed and is
 * otherwise a normal security card (it counts toward the stack and stays at its position).
 */
export async function expectFaceUpSecurityStaysRevealed(option: FaceUpSecurityOption) {
  const s = await useFaceUpSecurityOption(option, [
    { card: "BT1-101", as: "top" },
    { card: "BT1-101", as: "bottom" },
  ]);
  const placed = s.state.players[0]!.security.at(-1)!;

  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
  expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-101", option.cardId]);
  expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("top").instanceId);
  expect(placed.faceUp).toBe(true);
  expect(identityVisibility(s, placed)).toEqual({ owner: true, opponent: true });
  expect(identityVisibility(s, s.inst("top"))).toEqual({ owner: false, opponent: false });
}

function setupCheckOfFaceUpOption(option: FaceUpSecurityOption, onEvent?: (event: ServerEvent) => void) {
  return setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: {
        hand: [{ card: option.securityPlayCard, as: "played" }],
        security: [{ card: option.cardId, as: "option", faceUp: true }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, onEvent },
  );
}

async function attackSecurity(s: EngineSetup) {
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "securityChecked"), 200);
  await settle(() => s.state.pendingDecision === undefined);
}

/** Q: how is a face-up security card checked? A: left revealed, otherwise as a standard check. */
export async function expectFaceUpSecurityCheckedLikeStandard(option: FaceUpSecurityOption) {
  const faceUpAtReveal: (boolean | undefined)[] = [];
  const s = setupCheckOfFaceUpOption(option, (event) => {
    if (event.kind === "securityRevealed") faceUpAtReveal.push(s.inst("option").faceUp);
  });
  const optionInstance = s.inst("option");
  await attackSecurity(s);

  expect(faceUpAtReveal).toEqual([true]);

  const revealed = s.events.filter((event) => event.kind === "securityRevealed");
  const checked = s.events.filter((event) => event.kind === "securityChecked");
  expect(revealed).toEqual([expect.objectContaining({ seat: 1, revealedCardId: option.cardId })]);
  expect(checked).toEqual([expect.objectContaining({ seat: 1, revealedCardId: option.cardId, resolution: "effect" })]);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([optionInstance.instanceId]);
}

/** Q: does a face-up security card's [Security] effect trigger when checked? A: yes. */
export async function expectFaceUpSecurityEffectTriggers(option: FaceUpSecurityOption) {
  const s = setupCheckOfFaceUpOption(option);
  await attackSecurity(s);

  expect(
    s.events.some(
      (event) => event.kind === "effectResolved" && event.sourceCardId === option.cardId && event.seat === 1,
    ),
  ).toBe(true);
  expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
    s.inst("played").instanceId,
  ]);
  expect(s.state.players[1]!.hand).toHaveLength(0);
}

/** Q: what happens when security with face-up cards is shuffled? A: they turn face down and stay so. */
export async function expectShuffleTurnsFaceUpSecurityDown(option: FaceUpSecurityOption) {
  const s = setupEngine(
    {
      0: {
        battleArea: ["BT1-045"],
        hand: [{ card: "BT15-092", as: "shuffler" }],
        security: [
          { card: "BT1-010", as: "faceDown" },
          { card: option.cardId, as: "option", faceUp: true },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  expect(s.inst("option").faceUp).toBe(true);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.security.every((card) => card.faceUp === false));
  await settle(() => s.state.pendingDecision === undefined);

  expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId).sort()).toEqual(
    [s.inst("faceDown").instanceId, s.inst("option").instanceId].sort(),
  );
  expect(s.inst("option").faceUp).toBe(false);
  expect(identityVisibility(s, s.inst("option"))).toEqual({ owner: false, opponent: false });
}
