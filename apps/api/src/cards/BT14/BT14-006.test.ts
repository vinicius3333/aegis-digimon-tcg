import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-006.js";

describe("BT14-006", () => {
  it("binds the paid, requirement-respecting digivolution to the trashed card", () =>
    expect(compiled.effects[0]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          actions: [
            { kind: "Digivolve", from: ["trash"], source: "triggerTrashedFromHand", payCost: true, optional: true },
          ],
        },
      ],
    }));

  it("digivolves only into the triggering trashed card and pays its normal cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["BT14-006"] }],
          trash: [
            { card: "BT14-072", as: "trigger" },
            { card: "BT14-074", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-072",
      trashedFromHandInstanceId: s.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT14-072");
    expect(s.perm("host").topCard.cardId).toBe("BT14-072");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-074"]);
    assertNoLoudGap(s);
  });

  it("does not evolve a breeding host or bypass the triggering card's level requirement", async () => {
    const breeding = setupEngine(
      {
        0: {
          breeding: { card: "BT14-071", as: "host", under: ["BT14-006"] },
          trash: [{ card: "BT14-072", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await breeding.ready();
    await advance(breeding.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-072",
      trashedFromHandInstanceId: breeding.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle();
    expect(breeding.perm("host").topCard.cardId).toBe("BT14-071");

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["BT14-006"] }],
          trash: [{ card: "BT14-078", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await invalid.ready();
    await advance(invalid.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-078",
      trashedFromHandInstanceId: invalid.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle();
    expect(invalid.perm("host").topCard.cardId).toBe("BT14-071");
    assertNoLoudGap(breeding);
    assertNoLoudGap(invalid);
  });
});
