import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-057.js";
import "../index.js";

describe("BT16-057", () => {
  it("de-digivolves an opposing Digimon by 1 by placing another DigiPolice Digimon underneath itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            targetIsPermanent: true,
            shedOwnCards: true,
          },
        },
      ],
    });
  });

  it("cannot attack on your turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "permanent",
          condition: { kind: "selfHasNoDigivolutionCards" },
        },
      ],
    });
  });

  it("restricts attacking only while it has no digivolution cards", async () => {
    const empty = setupEngine({ 0: { battleArea: [{ card: "BT16-057", as: "empty" }] } });
    await empty.engine.recomputeContinuousEffects();
    expect(observe(empty.engine).isRestricted(empty.perm("empty"), "attack")).toBe(true);

    const stacked = setupEngine({ 0: { battleArea: [{ card: "BT16-057", as: "stacked", under: ["BT16-050"] }] } });
    await stacked.engine.recomputeContinuousEffects();
    expect(observe(stacked.engine).isRestricted(stacked.perm("stacked"), "attack")).toBe(false);
  });

  it("places another DigiPolice Digimon underneath itself before de-digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-057", as: "mekano" }],
          battleArea: [{ card: "BT16-050", as: "source" }],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "opponent", under: [{ card: "BT1-009", as: "opponentBase" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const sourcePermanentId = s.perm("source").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mekano").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mekano").stack.some((card) => card.instanceId === s.inst("source").instanceId));

    expect(s.perm("mekano").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === sourcePermanentId)).toBe(false);
    expect(s.perm("opponent").topCard?.instanceId).toBe(s.inst("opponentBase").instanceId);
  });
});
