import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import { buildEffectContext, cardSourceOf } from "./gameEngine/effectContext.js";
import { canPayCost } from "./effects/interpreter/cost/canPay.js";

async function returnSecondTarget(s: EngineSetup, actor: 0 | 1, previousDecisionId: string) {
  await settle(() => s.decisions.at(-1)!.req.decisionId !== previousDecisionId);
  const choice = s.decisions.at(-1)!.req;
  expect(choice.kind).toBe("chooseTargets");
  const targetId = s.perm("targetTwo").permanentId;
  expect(choice.options?.candidateInstanceIds).toContain(targetId);
  expect(
    s.engine.applyIntent(actor, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.inst("retained").instanceId] },
    }).ok,
  ).toBe(false);
  // Duplicate submitted identities are normalized to one physical choice.
  const pick = {
    type: "respondDecision" as const,
    decisionId: choice.decisionId,
    response: { kind: "chooseTargets" as const, instanceIds: [targetId, targetId] },
  };
  expect(s.engine.applyIntent(actor, pick)).toEqual({ ok: true });
  expect(s.engine.applyIntent(actor, pick).ok).toBe(false);
}

describe("Discord 1557652222744199228 Vademon ordered memory attribution", () => {
  for (const actor of [0, 1] as const) {
    const opponent = actor === 0 ? 1 : 0;
    it(`seat ${actor}: bottom face-down payment cannot be replaced by an upper ACE source`, async () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
      s.putOnBoard(actor, {
        card: "BT22-061",
        as: "vademon",
        under: [
          { card: "BT1-009", as: "payment", faceUp: false },
          { card: "BT14-014", as: "upper", faceUp: false },
        ],
      });
      s.putOnBoard(opponent, { card: "BT14-014", as: "target", suspended: true });
      preferInstanceIds.push(s.inst("upper").instanceId);
      s.state.turnSeat = actor;
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(actor, {
          type: "attack",
          attackerPermanentId: s.perm("vademon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[opponent]!.hand.some((card) => card.instanceId === s.inst("target").instanceId) &&
          s.state.pendingDecision === undefined &&
          !observe(s.engine).isAttacking(),
      );
      expect(s.state.memory).toBe(6);
      expect(s.state.players[actor]!.trash.map((card) => card.instanceId)).toEqual([s.inst("payment").instanceId]);
      expect(s.perm("vademon").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
    });
    for (const secondFaceUp of [false, true]) {
      it(`seat ${actor}: duplicate ACE identities, second attachment faceUp=${secondFaceUp}, and inherited memory`, async () => {
        const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
        s.putOnBoard(actor, {
          card: "BT22-061",
          as: "vademon",
          under: [
            { card: "BT14-014", as: "payment", faceUp: false },
            { card: "BT14-014", as: "retained", faceUp: false },
            { card: "BT6-025", as: "inherited" },
          ],
        });
        // Level 3 is not peeled by De-Digivolve; both ACE sources leave with the return.
        s.putOnBoard(opponent, {
          card: "BT1-013",
          as: "target",
          suspended: true,
          under: [
            { card: "BT14-014", as: "attachmentOne" },
            { card: "BT14-014", as: "attachmentTwo", faceUp: secondFaceUp },
          ],
        });
        s.state.turnSeat = actor;
        s.state.memory = 1;
        await s.ready();
        expect(
          s.engine.applyIntent(actor, {
            type: "attack",
            attackerPermanentId: s.perm("vademon").permanentId,
            target: { kind: "permanent", permanentId: s.perm("target").permanentId },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[opponent]!.hand.some((card) => card.instanceId === s.inst("target").instanceId) &&
            s.state.pendingDecision === undefined &&
            !observe(s.engine).isAttacking(),
        );
        expect(s.state.memory).toBe(secondFaceUp ? 8 : 5);
        expect(s.state.players[actor]!.trash.map((card) => card.instanceId)).toEqual([s.inst("payment").instanceId]);
        expect(s.perm("vademon").stack.map((card) => card.instanceId)).toEqual([
          s.inst("retained").instanceId,
          s.inst("inherited").instanceId,
        ]);
        expect(s.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
          s.inst("attachmentOne").instanceId,
          s.inst("attachmentTwo").instanceId,
        ]);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          secondFaceUp ? 2 : 1,
        );
        expect(s.events.filter((event) => event.kind === "memoryChanged")).toEqual([
          { kind: "memoryChanged", from: 1, to: 4, reason: "overflow" },
          ...(secondFaceUp ? [{ kind: "memoryChanged", from: 4, to: 7, reason: "overflow" }] : []),
          { kind: "memoryChanged", from: secondFaceUp ? 7 : 4, to: secondFaceUp ? 8 : 5, reason: "gainMemory" },
        ]);
        const paymentIndex = s.events.findIndex(
          (event) => event.kind === "cardsMoved" && event.trashedSources !== undefined,
        );
        const overflowIndex = s.events.findIndex(
          (event) => event.kind === "memoryChanged" && event.reason === "overflow",
        );
        const returnIndex = s.events.findIndex(
          (event) => event.kind === "cardsMoved" && event.returnedPermanents !== undefined,
        );
        expect(paymentIndex).toBeLessThan(overflowIndex);
        expect(overflowIndex).toBeLessThan(returnIndex);
        expect(s.events[paymentIndex]).toMatchObject({ seat: actor, instanceIds: [s.inst("payment").instanceId] });
        expect(s.events[returnIndex]).toMatchObject({ seat: opponent, instanceIds: [s.inst("target").instanceId] });
        expect(
          s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT6-025"),
        ).toMatchObject([{ seat: actor, isInherited: true }]);
        expect(
          s.events.filter(
            (event) =>
              event.kind === "cardsMoved" && event.trashedSources?.permanentId === s.perm("vademon").permanentId,
          ),
        ).toHaveLength(1);
      });
    }

    it(`seat ${actor}: De-Digivolve ACE Overflow precedes payment, and attacking cannot pay again`, async () => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      s.putOnBoard(actor, {
        card: "BT22-049",
        as: "base",
        under: [
          { card: "BT14-014", as: "payment", faceUp: false },
          { card: "BT14-014", as: "retained", faceUp: false },
        ],
      });
      s.putOnBoard(opponent, { card: "BT14-014", as: "peeled", under: [{ card: "BT1-013", as: "returned" }] });
      s.putOnBoard(opponent, { card: "BT1-085", as: "remainingTamer" });
      s.give(actor, Zone.Hand, { card: "BT22-061", as: "vademon" });
      s.give(opponent, Zone.Security, "BT1-009");
      s.state.turnSeat = actor;
      s.state.memory = 6;
      await s.ready();
      expect(
        s.engine.applyIntent(actor, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("vademon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[opponent]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(8); // ordinary cost 3 minus two face-down reductions, then opponent Overflow 3
      expect(
        s.engine.applyIntent(actor, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackDeclared") &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(8);
      expect(s.state.players[actor]!.trash.map((card) => card.instanceId)).toEqual([s.inst("payment").instanceId]);
      expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("retained").instanceId)).toBe(true);
      expect(
        s.state.players[opponent]!.battleArea.some((perm) => perm.permanentId === s.perm("remainingTamer").permanentId),
      ).toBe(true);
      expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(1);
      expect(s.events.filter((event) => event.kind === "memoryChanged")).toEqual([
        { kind: "memoryChanged", from: 6, to: 5, reason: "payCost" },
        { kind: "memoryChanged", from: 6, to: 5, reason: "digivolve" },
        { kind: "memoryChanged", from: 5, to: 8, reason: "overflow" },
      ]);
      const peeledIndex = s.events.findIndex(
        (event) => event.kind === "cardsMoved" && event.strippedStackTops !== undefined,
      );
      const overflowIndex = s.events.findIndex(
        (event) => event.kind === "memoryChanged" && event.reason === "overflow",
      );
      const paymentIndex = s.events.findIndex(
        (event) => event.kind === "cardsMoved" && event.trashedSources !== undefined,
      );
      expect(peeledIndex).toBeLessThan(overflowIndex);
      expect(overflowIndex).toBeLessThan(paymentIndex);
      expect(s.events[peeledIndex]).toMatchObject({ seat: opponent, instanceIds: [s.inst("peeled").instanceId] });
      expect(s.events[paymentIndex]).toMatchObject({ seat: actor, instanceIds: [s.inst("payment").instanceId] });
      expect(
        s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT22-061"),
      ).toHaveLength(1);
    });

    for (const accept of [false, true]) {
      it(`seat ${actor}: manual payment accept=${accept} rejects forged targets and cannot charge twice`, async () => {
        const s = setupEngine({ 0: {}, 1: {} });
        s.putOnBoard(actor, {
          card: "BT22-049",
          as: "base",
          under: [
            { card: "BT14-014", as: "payment", faceUp: false },
            { card: "BT14-014", as: "retained", faceUp: false },
          ],
        });
        s.putOnBoard(opponent, { card: "BT14-014", as: "targetOne" });
        s.putOnBoard(opponent, { card: "BT14-014", as: "targetTwo" });
        s.give(actor, Zone.Hand, { card: "BT22-061", as: "vademon" });
        s.state.turnSeat = actor;
        s.state.memory = 6;
        await s.ready();
        expect(
          s.engine.applyIntent(actor, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("vademon").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision !== undefined);
        const deDigivolve = s.decisions.at(-1)!.req;
        expect(deDigivolve.kind).toBe("chooseTargets");
        expect(
          s.engine.applyIntent(actor, {
            type: "respondDecision",
            decisionId: deDigivolve.decisionId,
            response: { kind: "chooseTargets", instanceIds: [s.perm("targetOne").permanentId] },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.decisions.at(-1)!.req.decisionId !== deDigivolve.decisionId);
        const optional = s.decisions.at(-1)!.req;
        expect(optional.kind).toBe("optional");
        expect(s.state.memory).toBe(5);
        const answer = {
          type: "respondDecision" as const,
          decisionId: optional.decisionId,
          response: { kind: "optional" as const, accept },
        };
        expect(s.engine.applyIntent(actor, answer)).toEqual({ ok: true });
        expect(s.engine.applyIntent(actor, answer).ok).toBe(false);
        expect(
          s.engine.applyIntent(actor, {
            type: "respondDecision",
            decisionId: optional.decisionId,
            response: { kind: "selectCards", instanceIds: [s.inst("retained").instanceId] },
          }).ok,
        ).toBe(false);
        if (accept) await returnSecondTarget(s, actor, optional.decisionId);
        await settle(
          () =>
            s.state.pendingDecision === undefined &&
            s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT22-061"),
        );
        expect(s.state.memory).toBe(accept ? 8 : 5);
        expect(s.state.players[actor]!.trash.map((card) => card.instanceId)).toEqual(
          accept ? [s.inst("payment").instanceId] : [],
        );
        expect(s.state.players[opponent]!.hand.map((card) => card.instanceId)).toEqual(
          accept ? [s.inst("targetTwo").instanceId] : [],
        );
        expect(
          s.state.players[opponent]!.battleArea.some(
            (perm) => perm.topCard.instanceId === s.inst("targetOne").instanceId,
          ),
        ).toBe(true);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          accept ? 1 : 0,
        );
        expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
      });
    }
  }

  for (const protectedSource of ["visible", "bottom", "upper"] as const) {
    it(`payment eligibility honors the bottom hidden source when ${protectedSource} is untrashable`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [
            {
              card: "BT22-061",
              as: "source",
              under: [
                { card: "BT1-009", as: "visible" },
                { card: "BT14-014", as: "bottom", faceUp: false },
                { card: "BT14-014", as: "upper", faceUp: false },
              ],
            },
          ],
        },
      });
      await s.ready();
      const source = cardSourceOf(s.engine as never, s.perm("source").topCard);
      const ctx = buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
      // Isolate payment availability: a protected bottom cannot be skipped in favor of an upper source.
      ctx.fx.canTrashDigivolutionCard = (id) => id !== s.inst(protectedSource).instanceId;
      expect(
        canPayCost(ctx, {
          kind: "trash",
          target: {
            filter: { isSelfRef: true, faceDown: true, position: "bottom" },
            count: 1,
            isSelf: true,
          },
        }),
      ).toBe(protectedSource !== "bottom");
    });
  }
});
