import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-077.js";

describe("BT16-077", () => {
  it("models Raid and Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Raid" }, { keyword: "Partition" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("during DNA digivolution plays a Free level 5 or lower from trash and grants Rush", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "isDnaDigivolving" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SelectBind",
      target: { bindAs: "rushAttacker" },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      optional: false,
      target: { fromSelectionRef: "rushAttacker" },
    });
    expect(compiled.effects?.[1]?.actions?.[3]).toMatchObject({
      kind: "Attack",
      target: { fromSelectionRef: "rushAttacker" },
      attackPlayer: true,
      withoutSuspending: false,
    });
  });

  it("DNA digivolves, plays a Free card, and completes the resulting player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-068", as: "purpleMaterial" },
            { card: "BT16-008", as: "redMaterial" },
          ],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: "BT16-008", as: "played" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-077")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
