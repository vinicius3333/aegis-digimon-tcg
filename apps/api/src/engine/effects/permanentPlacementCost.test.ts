import { EffectTiming, type Cost } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("permanent placement costs with named post-cost ceilings", () => {
  const typedPermanentCost = {
    kind: "place",
    targetIsPermanent: true,
    shedOwnCards: true,
  } satisfies Cost;

  it("stores the material's level, sheds its prior attachments, and resolves Return only after relocation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-029", as: "source", under: [{ card: "BT15-025", as: "existingBottom" }] },
            {
              card: "BT15-023",
              as: "material",
              under: [{ card: "BT15-001", as: "oldSource" }],
              linked: [{ card: "BT15-002", as: "oldLink" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-023", as: "eligible" },
            { card: "BT15-025", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.inst("oldLink").ownerSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() =>
      s.state.players[1]!.deck.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId),
    );

    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existingBottom").instanceId,
    ]);
    expect(typedPermanentCost.shedOwnCards).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("oldSource").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("oldLink").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("tooHigh").permanentId,
    );
  });
});
