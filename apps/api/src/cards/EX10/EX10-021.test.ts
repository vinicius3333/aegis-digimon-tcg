import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-021.js";
import "../index.js";

const CARD_ID = "EX10-021";

describe("EX10-021 Belphemon: Sleep Mode", () => {
  it("proves the Rage Mode placement cost, mandatory immunity, and hand-trash suspend trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Belphemon: Rage Mode"], cost: 1, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "attack",
            duration: "untilOpponentTurnEnd",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "top",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ match: "name", tokens: ["Belphemon: Rage Mode"] }],
                },
                count: 1,
              },
            },
          },
          { kind: "GrantImmunity", immuneFrom: "opponentEffects", duration: "untilOpponentTurnEnd", optional: false },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              optional: true,
              abortOnDecline: true,
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
            },
          ],
        },
      ],
    });
  });

  it("records the exact catalog and both evolution routes", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
    const normal = setupEngine({
      0: { battleArea: [{ card: "BT10-081", as: "base" }], hand: [{ card: CARD_ID, as: "sleep" }] },
    });
    normal.state.memory = 3;
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("base").permanentId,
        instanceId: normal.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("base").topCard.cardId === CARD_ID);
    expect(normal.state.memory).toBe(0);

    const alternate = setupEngine({
      0: { battleArea: [{ card: "EX10-022", as: "rage" }], hand: [{ card: CARD_ID, as: "sleep" }] },
    });
    alternate.state.memory = 1;
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("rage").permanentId,
        instanceId: alternate.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("rage").topCard.cardId === CARD_ID);
    expect(alternate.state.memory).toBe(0);
  });

  it("places exactly Rage Mode as the top source and gains attack lock plus opposing-effect immunity", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep", under: [{ card: "BT10-081", as: "base" }] }],
          trash: [
            { card: "EX10-022", as: "rage" },
            { card: "BT13-088", as: "otherSleep" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("otherSleep").instanceId, s.inst("rage").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("sleep"));
    expect(s.perm("sleep").stack.at(-1)?.instanceId).toBe(s.inst("rage").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("otherSleep").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(true);
  });

  it("may refuse the Rage Mode placement and then gains neither restriction", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "sleep" }], trash: [{ card: "EX10-022", as: "rage" }] } },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("sleep"));
    expect(s.perm("sleep").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(false);
  });

  it("on the opponent's turn trashes exactly 2 cards and suspends exactly 2 Digimon or Tamers once", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep" }],
          hand: [
            { card: "BT1-001", as: "cost1" },
            { card: "BT1-002", as: "cost2" },
            { card: "BT1-003", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "trigger" },
            { card: "BT1-010", as: "digimon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("cost1").instanceId,
      s.inst("cost2").instanceId,
      s.perm("digimon").permanentId,
      s.perm("tamer").permanentId,
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("trigger").permanentId,
    });
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost1").instanceId, s.inst("cost2").instanceId]),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    s.perm("trigger").isSuspended = false;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("trigger").permanentId,
    });
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("cannot partially pay the 2-card hand cost and does not trigger on its own turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: CARD_ID, as: "sleep" }], hand: [{ card: "BT1-001", as: "only" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "trigger" },
              { card: "BT1-010", as: "target" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = turnSeat;
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenSuspended", {
        subjectPermanentId: s.perm("trigger").permanentId,
      });
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("only").instanceId);
      expect(s.perm("target").isSuspended).toBe(false);
    }
  });
});
