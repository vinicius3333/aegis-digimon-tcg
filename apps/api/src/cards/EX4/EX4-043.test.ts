import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-043.js";

describe("EX4-043 Garurumon", () => {
  it("may digivolve another own Digimon into a level six or lower Greymon from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costDelta: -2,
      optional: true,
      target: { filter: { controller: "mine", excludeSelf: true } },
      into: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] },
    });
  });
  it("has inherited Reboot", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-043");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("triggers from a public evolution and permits declining the printed optional evolution", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "sourceBase" },
            { card: "BT1-020", as: "other" },
          ],
          hand: [
            { card: "EX4-043", as: "garurumon" },
            { card: "BT1-025", as: "greymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    positive.state.memory = 10;
    await positive.ready();
    expect(
      positive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: positive.perm("sourceBase").permanentId,
        instanceId: positive.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => positive.perm("sourceBase").topCard?.cardId === "EX4-043");
    await settle(() => positive.perm("other").topCard?.cardId === "BT1-025");
    expect(positive.perm("sourceBase").stack.map(({ cardId }) => cardId)).toEqual(["EX3-046"]);
    expect(positive.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT1-020"]);
    expect(positive.state.memory).toBe(7);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "sourceBase" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [
            { card: "EX4-043", as: "garurumon" },
            { card: "BT1-015", as: "greymon" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    declined.state.memory = 10;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: declined.perm("sourceBase").permanentId,
        instanceId: declined.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    const decision = declined.state.pendingDecision!;
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.perm("sourceBase").topCard?.cardId).toBe("EX4-043");
    expect(declined.perm("other").topCard?.cardId).toBe("BT1-010");
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("greymon").instanceId,
    );
    expect(declined.state.memory).toBe(8);
  });

  it("ignores wrong-name and over-level candidates after a public source evolution", async () => {
    for (const { targetBase, candidate } of [
      { targetBase: "BT1-020", candidate: "BT1-026" },
      { targetBase: "BT1-025", candidate: "BT13-020" },
    ]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX3-046", as: "sourceBase" },
              { card: targetBase, as: "other" },
            ],
            hand: [
              { card: "EX4-043", as: "source" },
              { card: candidate, as: "candidate" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("sourceBase").permanentId,
          instanceId: s.inst("source").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("sourceBase").topCard?.cardId === "EX4-043");
      await settle();

      expect(s.perm("other").topCard?.cardId).toBe(targetBase);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.memory).toBe(8);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX4-043")).toHaveLength(0);
    }
  });

  it("digivolves another Digimon from hand for two less and rejects a non-Greymon", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    positive.state.memory = 10;
    await positive.ready();
    await advance(positive.engine).fire(EffectTiming.WhenDigivolving, positive.perm("source"));
    await settle(() => positive.perm("other").topCard?.cardId === "BT1-015");
    expect(positive.perm("other").topCard?.cardId).toBe("BT1-015");
    expect(positive.state.memory).toBe(10);

    const negative = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT1-036", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await negative.ready();
    await advance(negative.engine).fire(EffectTiming.WhenDigivolving, negative.perm("source"));
    await settle();
    expect(negative.perm("other").topCard?.cardId).toBe("BT1-010");
    expect(negative.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      negative.inst("wrongName").instanceId,
    );
  });

  it("accepts a Greymon-named level 6 at the boundary and rejects a level 7", async () => {
    const boundary = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "source" },
            { card: "BT1-021", as: "other" },
          ],
          hand: [{ card: "BT1-025", as: "levelSixGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    boundary.state.memory = 10;
    await boundary.ready();
    await advance(boundary.engine).fire(EffectTiming.WhenDigivolving, boundary.perm("source"));
    await settle(() => boundary.perm("other").topCard?.cardId === "BT1-025");
    expect(boundary.perm("other").topCard?.cardId).toBe("BT1-025");
    expect(boundary.state.memory).toBe(9);

    const tooHigh = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "source" },
            { card: "BT1-021", as: "other" },
          ],
          hand: [{ card: "BT13-020", as: "levelSevenGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await tooHigh.ready();
    await advance(tooHigh.engine).fire(EffectTiming.WhenDigivolving, tooHigh.perm("source"));
    await settle();
    expect(tooHigh.perm("other").topCard?.cardId).toBe("BT1-021");
    expect(tooHigh.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      tooHigh.inst("levelSevenGreymon").instanceId,
    );
  });

  it("allows declining the may effect without changing the board or hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.perm("other").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
  });

  it("Reboot unsuspends during the opponent's public Active Phase, not the control Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "host", suspended: true, under: ["EX4-043"] },
          { card: "BT1-010", as: "control", suspended: true },
        ],
        deck: ["BT1-009", "BT1-011", "BT1-012"],
      },
      1: { hand: [{ card: "BT1-009", as: "mainAction" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("control").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  ex4CardBehaviorTests("EX4-043");
});
