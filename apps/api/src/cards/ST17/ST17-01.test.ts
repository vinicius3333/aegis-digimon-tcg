import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST17-01.js";

describe("ST17-01 Gummymon [When Attacking]", () => {
  it("draws once when its host attacks while its owner has a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "host", under: ["ST17-01"] },
            { card: "ST17-10", as: "henry" },
          ],
          deck: ["ST17-03", "ST17-04"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    const handBefore = player.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.hand.length === handBefore + 1);

    expect(player.hand.length).toBe(handBefore + 1);
    expect(player.deck.length).toBe(1);
  });

  it("does not draw when the owner has no green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-02", as: "host", under: ["ST17-01"] }],
        deck: ["ST17-03"],
      },
      1: { security: ["BT1-001"] },
    });
    const player = s.state.players[0]!;
    const handBefore = player.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.length === 1);

    expect(player.hand.length).toBe(handBefore);
    expect(player.deck).toHaveLength(1);
  });
});
