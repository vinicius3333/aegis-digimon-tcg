import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-12.js";

describe("ST16-12 MetalGarurumon", () => {
  it("trashes one hand card and deletes the opponent's lowest-level Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-12", as: "metalgarurumon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "ST16-08", as: "lowest", suspended: true },
            { card: "ST16-11", as: "higher", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalgarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("higher").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST16-08"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["ST16-11"]);
  });
});
