import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-012", () => {
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
          hand: [{ card: "AD1-004", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    positive.state.turnSeat = 0;
    await positive.ready();
    await advance(positive.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: positive.perm("garurumon").permanentId,
    });
    await settle(() => positive.perm("source").topCard?.cardId === "AD1-004");
    expect(positive.perm("source").topCard?.cardId).toBe("AD1-004");

    const positiveDigivolution = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "AD1-010", as: "garurumon" },
          ],
          hand: [{ card: "AD1-004", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    positiveDigivolution.state.turnSeat = 0;
    await positiveDigivolution.ready();
    await advance(positiveDigivolution.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: positiveDigivolution.perm("garurumon").permanentId,
    });
    await settle(() => positiveDigivolution.perm("source").topCard?.cardId === "AD1-004");
    expect(positiveDigivolution.perm("source").topCard?.cardId).toBe("AD1-004");

    const negative = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "AD1-001", as: "nonMatching" },
          ],
          hand: [{ card: "AD1-004", as: "greymon" }],
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
