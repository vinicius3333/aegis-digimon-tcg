import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-059.js";
import "./index.js";

describe("BT17-059 Diaboromon", () => {
  it("redirects an opponent's attack once per turn to one of your named Diaboromon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("places Doomsday Clock from hand under itself before the optional token play on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "base" }],
          hand: [
            { card: "BT17-059", as: "diaboromon" },
            { card: "BT17-100", as: "clock" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.cardId === "BT17-100"));

    expect(s.perm("base").stack.some((card) => card.cardId === "BT17-100")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-100")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(2);
  });

  it("redirects the first opponent attack and consumes the once-per-turn window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-059", as: "diaboromon" }] },
        1: {
          battleArea: [
            { card: "BT17-052", as: "attackerOne" },
            { card: "BT17-053", as: "attackerTwo" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerOneId = s.inst("attackerOne").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === attackerOneId));

    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
  });
});
