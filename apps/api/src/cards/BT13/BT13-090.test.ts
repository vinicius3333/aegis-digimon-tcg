import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-090.js";

describe("BT13-090 LordKnightmon", () => {
  it("may return one Lucemon-named or Royal Knight card from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            optional: true,
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  { match: "name", tokens: ["Lucemon"] },
                  { match: "trait", tokens: ["Royal Knight"] },
                ],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("gains 1 memory per Royal Knight Digimon when an opponent's Digimon attacks", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [{ kind: "GainMemory", amount: 1 }],
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ event: "whenOpponentAttacks" })],
    });
  });

  it("returns a Lucemon or Royal Knight card from trash on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-090", as: "lord" }], trash: [{ card: "BT13-075", as: "royal" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lord"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT13-075");
  });

  it("may decline the On Play return and leave the matching card in trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-090", as: "lord" }], trash: [{ card: "BT13-075", as: "royal" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lord"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-075")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-075")).toBe(true);
  });

  it("gains one memory for each own Royal Knight on a natural opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-090", as: "lord" },
            { card: "BT13-075", as: "royalOne" },
            { card: "BT13-087", as: "royalTwo" },
          ],
        },
        1: { battleArea: [{ card: "BT13-081", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });
});
