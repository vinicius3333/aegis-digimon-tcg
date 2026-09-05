import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-072.js";

describe("EX9-072", () => {
  it("loses its face-up security DP bonus after a real check and excludes face-up, non-DM and opposing sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-007", as: "attacker", under: [{ card: "BT1-009", faceUp: false }] }] },
        1: {
          security: [{ card: "EX9-072", faceUp: true }],
          battleArea: [
            {
              card: "EX9-007",
              as: "host",
              under: [
                { card: "BT1-048", faceUp: false },
                { card: "BT1-046", faceUp: false },
                { card: "EX9-001", faceUp: true },
              ],
            },
            { card: "BT1-009", as: "nonDM", under: [{ card: "BT1-048", faceUp: false }] },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const base = s.perm("host").currentDP;
    const attackerBase = s.perm("attacker").currentDP;
    const nonDMBase = s.perm("nonDM").currentDP;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(base + 2000);
    expect(s.perm("attacker").currentDP).toBe(attackerBase);
    expect(s.perm("nonDM").currentDP).toBe(nonDMBase);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX9-072"]);
    expect(s.perm("host").currentDP).toBe(base);
    expect(s.perm("host").stack).toHaveLength(3);
  });
  it.each(["EX9-012", "BT1-009"])("does not play an ineligible Security candidate %s", async (candidate) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [{ card: "EX9-072", faceUp: true }],
          hand: [candidate],
          trash: [candidate],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual([candidate]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([candidate, "EX9-072"]);
  });
  it("does not waive White requirements when an own security card is face up", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX9-072", as: "source" }], security: [{ card: "BT1-009", faceUp: true }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }).ok).toBe(false);
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-072"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    { from: "hand", candidate: "EX9-009", accept: true },
    { from: "trash", candidate: "EX9-009", accept: true },
    { from: "hand", candidate: "EX9-068", accept: true },
    { from: "hand", candidate: "EX9-009", accept: false },
  ])(
    "Q4839 real face-up security check: $candidate from $from, accept=$accept",
    async ({ from, candidate, accept }) => {
      const options = { autoSelectCards: true, autoDeclineOptional: false, preferInstanceIds: [] as string[] };
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
          1: {
            security: [{ card: "EX9-072", as: "island", faceUp: true }],
            hand: from === "hand" ? [{ card: candidate, as: "candidate" }] : [],
            trash: from === "trash" ? [{ card: candidate, as: "candidate" }] : [],
          },
        },
        options,
      );
      options.preferInstanceIds.push(s.inst("candidate").instanceId);
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.state.pendingDecision?.kind).toBe("optional");
      const choice = s.state.pendingDecision!;
      options.autoDeclineOptional = true;
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: choice.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.memory).toBe(3);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.players[1]!.battleArea.map((card) => card.topCard.cardId)).toEqual(accept ? [candidate] : []);
      expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(
        !accept && from === "hand" ? [candidate] : [],
      );
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX9-072"]);
    },
  );
  it("waives color requirements when there are no face-up security cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "noFaceUpSecurity" } }],
    }));
  it("gives own DM Digimon +1000 DP per face-down digivolution card from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          scaling: { unit: "targetFaceDownDigivolutionCards", per: 1, filter: { faceDown: true } },
        },
      ],
    }));
  it("trades the bottom security card for this card as face-up bottom security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, target: { filter: { playCostLte: 5 } } },
      ],
    });
  });
  it("adds the bottom security card to hand and places itself face-up at security bottom", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-072", as: "source" }], security: ["BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === "EX9-072");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-072"]);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });
  it("places itself face-up at security bottom even when security was empty", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX9-072", as: "source" }] } }, { autoOrderTriggers: true });

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === "EX9-072");

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX9-072", faceUp: true });
  });
  it("scales the security DM Digimon DP bonus from its face-down sources", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX9-072", as: "source", faceUp: true }],
        battleArea: [
          {
            card: "EX9-007",
            as: "host",
            dp: 3000,
            under: [
              { card: "BT1-009", faceUp: false },
              { card: "BT1-010", faceUp: false },
            ],
          },
          { card: "EX9-010", as: "secondHost", dp: 3000, under: [{ card: "BT1-009", faceUp: false }] },
        ],
      },
    });
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.perm("host").stack.every((card) => card.faceUp === false)).toBe(true);
    await s.ready();
    expect(s.inst("source").faceUp).toBe(true);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("secondHost").currentDP).toBe(4000);
  });
  it("plays a qualifying DM Digimon from hand when its security effect triggers", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX9-072", as: "source" }], hand: ["EX9-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-010")).toBe(false);
  });
});
