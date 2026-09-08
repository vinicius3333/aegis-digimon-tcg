import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { compiledEffects } from "@aegis/shared";
import "../../cards/index.js";

/**
 * Seam 16 `save-placeunder-position-default`.
 *
 * Comprehensive Rules 4-3: ＜Save＞ places the card at the BOTTOM of the Tamer's
 * digivolution stack. Most ＜Save＞ cards compile a positionless `PlaceUnder`, and
 * `runPlaceUnder` reads `belowTop: action.position !== "bottom"`, so a positionless
 * record used to land the card directly beneath the Tamer instead. The registration
 * normalizer now defaults a ＜Save＞ effect's `PlaceUnder` to `position: "bottom"`.
 */
describe("＜Save＞ PlaceUnder position default", () => {
  it("normalizes a positionless ＜Save＞ PlaceUnder to the stack bottom", () => {
    const record = compiledEffects["BT10-020"];
    const save = record?.effects.find((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Save"));
    expect(save?.actions?.[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
  });

  it("places a positionless ＜Save＞ card under the cards already on the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-020", as: "saver" },
            { card: "BT12-094", as: "tamer", under: [{ card: "BT1-013", as: "older" }] },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const saverId = s.inst("saver").instanceId;
    const olderId = s.inst("older").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("saver").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === saverId));
    await settle(() => false, 30);

    // `Permanent.stack` is bottom-first: the saved card must sit below the older card.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([saverId, olderId]);
  });
});
