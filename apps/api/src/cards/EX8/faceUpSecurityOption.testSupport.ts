import { expect } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import "../EX5/EX5-027.js";
import "../EX7/EX7-015.js";
import "./index.js";

/** The EX8 trait Options whose [Main] places them face up as the bottom security card. */
export type FaceUpSecurityOption = "EX8-068" | "EX8-069" | "EX8-071";

/** A level 5 or lower Digimon with the trait each Option's [Security] effect plays from hand. */
export const traitDigimonFor: Record<FaceUpSecurityOption, string> = {
  "EX8-068": "EX8-058",
  "EX8-069": "EX7-015",
  "EX8-071": "EX8-032",
};

/** Seat 0 plays `option` from hand during its turn; the Option ends in security. */
export async function playOptionFromHand(option: FaceUpSecurityOption, seatZero: SeatSpec = {}): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { ...seatZero, hand: [{ card: option, as: "option" }, ...(seatZero.hand ?? [])] },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 6000 }], security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const optionId = s.inst("option").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.security.some((card) => card.instanceId === optionId) &&
      s.state.pendingDecision === undefined,
  );
  return s;
}

/** Seat 1's `attacker` attacks seat 0 directly and the attack runs to completion. */
export async function seatOneAttacksPlayer(s: EngineSetup): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 3;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
}

/** Seat 0 plays EX5-027 Liollmon, whose [On Play] finds no [Leomon] and shuffles the security stack. */
export async function shuffleSecurityWithLiollmon(s: EngineSetup): Promise<void> {
  const liollmonId = s.inst("liollmon").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: liollmonId })).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX5-027") &&
      s.state.pendingDecision === undefined,
  );
}
