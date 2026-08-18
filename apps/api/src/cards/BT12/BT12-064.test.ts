import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-064.js";

describe("BT12-064 Tuwarmon", () => {
  it("raises its De-Digivolve level ceiling per 2 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-064", as: "tuwa", under: ["BT1-009", "BT1-010"] }] },
        1: { battleArea: [{ card: "BT1-025", as: "target", under: ["BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tuwa"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-015");
  });

  it("Saves itself and another Save Digimon from trash under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-064", as: "tuwa" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-060", as: "saved" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("tuwa").topCard.instanceId;
    const savedId = s.inst("saved").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("tuwa").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([sourceId, savedId]),
    );
  });

  it("gives Blocker to a Save-text host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-064"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
