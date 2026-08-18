import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-011.js";
import "./EX1-015.js";
import "./EX1-017.js";
import "./EX1-021.js";
import "./EX1-034.js";

describe("EX1 MetalGarurumon hand toolbox deck", () => {
  it("resolves four inherited/on-top attack effects and preserves reveal-bottom order", async () => {
    const handFillers = Array.from({ length: 8 }, () => "BT1-029");
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-021",
              as: "metalGarurumon",
              under: ["EX1-011", "EX1-015", "EX1-017"],
            },
            { card: "ST2-12", as: "existingMatt" },
            { card: "BT1-009", as: "spareDigimon" },
          ],
          hand: [
            { card: "ST2-12", as: "mattToPlay" },
            ...handFillers,
          ],
          deck: [
            { card: "EX1-011", as: "revealedGabumon" },
            { card: "ST2-12", as: "revealedMatt" },
            { card: "BT1-009", as: "revealedRest" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
        1: {
          battleArea: [{
            card: "EX1-034",
            as: "palmonTarget",
            under: [
              { card: "BT1-069", as: "firstSource" },
              { card: "BT1-070", as: "secondSource" },
            ],
          }],
          security: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferredInstanceIds,
      },
    );
    preferredInstanceIds.push(
      s.inst("mattToPlay").instanceId,
      s.inst("revealedGabumon").instanceId,
      s.perm("palmonTarget").permanentId,
    );
    const palmonTopId = s.perm("palmonTarget").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("metalGarurumon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      s.state.players[0]!.battleArea.some(
        ({ topCard }) => topCard.instanceId === s.inst("mattToPlay").instanceId,
      ) &&
      s.state.players[0]!.hand.some(
        ({ instanceId }) => instanceId === s.inst("revealedGabumon").instanceId,
      ) &&
      s.state.players[1]!.deck.some(
        ({ instanceId }) => instanceId === palmonTopId,
      ),
      5000,
    );

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(9);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("revealedMatt").instanceId,
      s.inst("revealedRest").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstSource").instanceId,
        s.inst("secondSource").instanceId,
      ]),
    );
    // Returning to deck is not deletion, so Palmon's On Deletion suspend never fires on
    // the otherwise eligible unsuspended spare Digimon.
    expect(s.perm("spareDigimon").isSuspended).toBe(false);
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
