import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-094.js";
import "../index.js";
import {
  identityVisibility,
  placeAtStartOfMain,
  stackIds,
  trashBottomTamerCardWithFalcomon,
} from "./tamerStack.testSupport.js";

describe("BT26-094 compiled behavior", () => {
  it("maps Keenan's placement, both Your Turn watchers, and Security clause", () => {
    expect(getCardDefinition("BT26-094")).toMatchObject({
      nameEn: "Keenan Crier",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenHandTrashed" }),
        expect.objectContaining({ event: "whenDigivolutionTrashed" }),
      ]),
    );
  });

  it("publicly places DATA SQUAD, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-094", as: "keenan" }],
          hand: [{ card: "P-235", as: "dataSquad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("keenan").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains Execute as the shared result of both public watcher clauses", () => {
    const actions = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actions: [expect.objectContaining({ kind: "CostGatedBlock" })] }),
      ]),
    );
  });
});

describe("BT26-094 Keenan Crier — KB Q&A rulings", () => {
  const placeDataSquad = () => placeAtStartOfMain("BT26-094", "BT26-044");

  it("places the paid card at the bottom of the face-down cards already under Keenan (Q7156)", async () => {
    const { s, placedId, finish } = await placeDataSquad();

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
    await finish();
  });

  it("offers no reorder of the face-down cards, so a bottom-card cost trashes the placed card (Q7157)", async () => {
    const { s, placedId, priorIds, finish } = await placeDataSquad();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    await finish();
  });

  it("lets only Keenan's owner look at the face-down card (Q7158)", async () => {
    const { s, finish } = await placeDataSquad();

    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
    await finish();
  });

  it("puts a trashed face-down card from under Keenan face up in the trash (Q7159)", async () => {
    const { s, placedId, finish } = await placeDataSquad();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await finish();
  });
});

describe("GitHub #5300 Keenan cost choice and mandatory Execute", () => {
  for (const channel of ["hand", "under"] as const) {
    for (const accept of [false, true]) {
      it(`${channel} trash: ${accept ? "paying the cost mandates Execute" : "declining keeps Keenan active"}`, async () => {
        const options = { autoSelectCards: true };
        const s = setupEngine(
          {
            0: {
              battleArea: [
                {
                  card: "BT26-094",
                  as: "keenan",
                  under: channel === "under" ? [{ card: "BT1-001", faceUp: false }] : [],
                },
                { card: "ST24-09", as: "eligible" },
                { card: "ST24-09", as: "otherEligible" },
                { card: "BT1-009", as: "ineligible" },
              ],
              hand: [{ card: channel === "hand" ? "EX6-049" : "ST24-12", as: "trigger" }],
              trash: ["ST24-08"],
            },
            1: { hand: Array.from({ length: 7 }, () => "BT1-009") },
          },
          options,
        );
        await s.ready();
        s.state.memory = 10;
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.pendingDecision?.kind === "optional");
        if (s.decisions.at(-1)?.req.sourceCardId === "ST24-12") {
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: s.state.pendingDecision!.decisionId,
              response: { kind: "optional", accept: true },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.decisions.at(-1)?.req.sourceCardId === "BT26-094");
        }
        expect(s.decisions.at(-1)?.req.sourceCardId).toBe("BT26-094");
        options.autoSelectCards = false;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response: { kind: "optional", accept },
          }),
        ).toEqual({ ok: true });
        if (accept) {
          await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
          const decisionId = s.state.pendingDecision!.decisionId;
          for (const instanceIds of [[], [s.perm("ineligible").permanentId]]) {
            expect(
              s.engine.applyIntent(0, {
                type: "respondDecision",
                decisionId,
                response: { kind: "chooseTargets", instanceIds },
              }).ok,
            ).toBe(false);
            expect(s.state.pendingDecision?.decisionId).toBe(decisionId);
          }
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId,
              response: { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] },
            }),
          ).toEqual({ ok: true });
        }
        await settle(() => s.state.pendingDecision === undefined);
        await drainMicrotasks();
        expect(s.perm("keenan").isSuspended).toBe(accept);
        expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Execute")).toBe(accept);
        expect(observe(s.engine).hasKeyword(s.perm("otherEligible"), "Execute")).toBe(false);
        expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Execute")).toBe(false);
        const target = s.decisions.find(({ req }) => req.sourceCardId === "BT26-094" && req.kind === "chooseTargets");
        if (accept) {
          expect(target?.req.options).toMatchObject({ min: 1, max: 1 });
          expect(target?.req.options?.candidateInstanceIds).not.toContain(s.perm("ineligible").permanentId);
        } else expect(target).toBeUndefined();
      });
    }
  }
});

describe("GitHub #5300 Keenan unavailable payload and cost controls", () => {
  it("can pay the suspension condition even with no DATA SQUAD target (CR15-7-5)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-094", as: "keenan" }], hand: [{ card: "EX6-049", as: "trigger" }] },
        1: { hand: Array.from({ length: 7 }, () => "BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 6 && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(s.perm("keenan").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT26-094" && req.kind === "chooseTargets")).toEqual(
      [],
    );
  });

  it("cannot pay an already suspended Keenan's condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan", suspended: true },
            { card: "ST24-09", as: "eligible" },
          ],
          hand: [{ card: "EX6-049", as: "trigger" }],
        },
        1: { hand: Array.from({ length: 7 }, () => "BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 6 && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Execute")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT26-094" && req.kind === "optional")).toEqual([]);
  });
});
