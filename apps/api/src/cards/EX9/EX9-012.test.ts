import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-012", () => {
  it("grants inherited +4000 on a real legal evolution and removes it on the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-012", as: "host" }],
        hand: [{ card: "ST1-10", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("ST1-10");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012"]);
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.state.memory).toBe(3);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes an opposing Digimon up to 8000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } },
    });
  });
  it("during your turn digivolves into Greymon after Garurumon/Tai and into Greymon after another Garurumon digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] },
      { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] },
    ]));

  it("deletes an opposing Digimon at the printed 8000 DP boundary on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-012", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("only free-digivolves after a matching Garurumon is played or digivolved", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "AD1-010", as: "garurumon" },
          ],
          hand: [{ card: "BT5-069", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    positive.state.turnSeat = 0;
    await positive.ready();
    await advance(positive.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: positive.perm("garurumon").permanentId,
    });
    await settle(() => positive.perm("source").topCard?.cardId === "BT5-069");
    expect(positive.perm("source").topCard?.cardId).toBe("BT5-069");

    const positiveDigivolution = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "AD1-010", as: "garurumon" },
          ],
          hand: [{ card: "BT5-069", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    positiveDigivolution.state.turnSeat = 0;
    await positiveDigivolution.ready();
    await advance(positiveDigivolution.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: positiveDigivolution.perm("garurumon").permanentId,
    });
    await settle(() => positiveDigivolution.perm("source").topCard?.cardId === "BT5-069");
    expect(positiveDigivolution.perm("source").topCard?.cardId).toBe("BT5-069");

    const negative = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "AD1-001", as: "nonMatching" },
          ],
          hand: [{ card: "BT5-069", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    negative.state.turnSeat = 0;
    await negative.ready();
    await advance(negative.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: negative.perm("nonMatching").permanentId,
    });
    await settle();
    expect(negative.perm("source").topCard?.cardId).toBe("EX9-012");
  });
});
