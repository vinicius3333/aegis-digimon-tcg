import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT26-043.js";
import "../index.js";

describe("BT26-043 Piximon", () => {
  it("encodes mandatory suspend, deck-top face-down payment, and scaled locks", () => {
    expect(digivolutionRequirementsFor("BT26-043")).toContainEqual({
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.keywords).toEqual([{ keyword: "Blocker", raw: "＜Blocker＞" }]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Suspend" },
        { kind: "PlaceUnder", fromDeckTop: true, faceDown: true, position: "bottom" },
        { kind: "Restrict", restriction: "unsuspend", scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 } },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
  });

  it("plays through the public engine seam and applies the printed lock", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-043", as: "piximon" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-085", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piximon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("locks separate targets for every face-down digivolution card (Q7034)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-043",
            as: "piximon",
            under: [
              { card: "BT1-001", faceUp: false },
              { card: "BT1-002", faceUp: false },
            ],
          },
        ],
        deck: [{ card: "BT1-003", as: "newFaceDown" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "suspendOnly" },
          { card: "BT1-010", as: "lockA" },
          { card: "BT1-011", as: "lockB" },
          { card: "BT1-085", as: "lockC" },
        ],
      },
    });

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("piximon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendOnly").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("lockA").permanentId, s.perm("lockB").permanentId, s.perm("lockC").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("piximon").stack.filter(({ faceUp }) => !faceUp)).toHaveLength(3);
    expect(s.perm("suspendOnly").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendOnly"), "unsuspend")).toBe(false);
    for (const alias of ["lockA", "lockB", "lockC"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    }
  });

  it("may suspend an opponent Digimon when another Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-044", as: "host", under: ["BT26-043"] }],
          hand: [{ card: "BT1-009", as: "played" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
