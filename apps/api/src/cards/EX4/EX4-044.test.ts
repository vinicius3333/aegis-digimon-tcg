import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-044.js";

describe("EX4-044 Greymon", () => {
  it("may digivolve another own Digimon into a level six or lower Garurumon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costDelta: -2,
      optional: true,
      target: { filter: { controller: "mine", excludeSelf: true } },
      into: {
        filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] },
      },
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
    const s = await playEx4Card("EX4-044");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("triggers from a public evolution and permits declining the printed optional evolution", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "sourceBase" },
            { card: "BT1-040", as: "other" },
          ],
          hand: [
            { card: "EX4-044", as: "greymon" },
            { card: "BT1-044", as: "garurumon" },
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
        instanceId: positive.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => positive.perm("sourceBase").topCard?.cardId === "EX4-044");
    await settle(() => positive.perm("other").topCard?.cardId === "BT1-044");
    expect(positive.perm("sourceBase").stack.map(({ cardId }) => cardId)).toEqual(["EX3-046"]);
    expect(positive.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT1-040"]);
    expect(positive.state.memory).toBe(7);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "sourceBase" },
            { card: "BT1-031", as: "other" },
          ],
          hand: [
            { card: "EX4-044", as: "greymon" },
            { card: "BT1-036", as: "garurumon" },
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
        instanceId: declined.inst("greymon").instanceId,
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
    expect(declined.perm("sourceBase").topCard?.cardId).toBe("EX4-044");
    expect(declined.perm("other").topCard?.cardId).toBe("BT1-031");
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("garurumon").instanceId,
    );
    expect(declined.state.memory).toBe(8);
  });

  it("ignores wrong-name and over-level candidates after a public source evolution", async () => {
    for (const { targetBase, candidate } of [
      { targetBase: "BT1-040", candidate: "BT1-043" },
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
              { card: "EX4-044", as: "source" },
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
      await settle(() => s.perm("sourceBase").topCard?.cardId === "EX4-044");
      await settle();

      expect(s.perm("other").topCard?.cardId).toBe(targetBase);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.memory).toBe(8);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX4-044")).toHaveLength(0);
    }
  });

  it("digivolves another own Digimon into Garurumon from hand for two less", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-044", as: "source" },
            { card: "BT1-031", as: "other" },
          ],
          hand: [{ card: "BT1-036", as: "garurumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    positive.state.memory = 10;
    await positive.ready();
    await advance(positive.engine).fire(EffectTiming.WhenDigivolving, positive.perm("source"));
    await settle(() => positive.perm("other").topCard?.cardId === "BT1-036");
    expect(positive.perm("other").topCard?.cardId).toBe("BT1-036");
    expect(positive.state.memory).toBe(10);

    const negative = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-044", as: "source" },
            { card: "BT1-031", as: "other" },
          ],
          hand: [{ card: "AD1-001", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await negative.ready();
    await advance(negative.engine).fire(EffectTiming.WhenDigivolving, negative.perm("source"));
    await settle();
    expect(negative.perm("other").topCard?.cardId).toBe("BT1-031");
    expect(negative.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      negative.inst("wrongName").instanceId,
    );
  });

  it("accepts the level-6 Garurumon boundary and pays its printed cost minus two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-044", as: "source" },
            { card: "BT1-040", as: "other" },
          ],
          hand: [{ card: "BT1-044", as: "levelSixGarurumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("other").topCard?.cardId === "BT1-044");

    expect(s.perm("other").topCard?.cardId).toBe("BT1-044");
    expect(s.state.memory).toBe(9);
  });

  it("allows declining the optional digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-044", as: "source" },
            { card: "BT1-031", as: "other" },
          ],
          hand: [{ card: "BT1-036", as: "garurumon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();

    expect(s.perm("other").topCard?.cardId).toBe("BT1-031");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("garurumon").instanceId);
    expect(s.state.memory).toBe(10);
  });

  it("Reboot unsuspends during the opponent's public Active Phase, not the control Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "host", suspended: true, under: ["EX4-044"] },
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
  ex4CardBehaviorTests("EX4-044");
});
