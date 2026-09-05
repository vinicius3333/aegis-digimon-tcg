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

  it("executes inherited Reboot during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", suspended: true, under: ["EX4-043"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await (s.engine as unknown as { unsuspendForActivePhase(seat: 0 | 1): Promise<string[]> }).unsuspendForActivePhase(
      1,
    );
    expect(s.perm("host").isSuspended).toBe(false);
  });
  ex4CardBehaviorTests("EX4-043");
});
