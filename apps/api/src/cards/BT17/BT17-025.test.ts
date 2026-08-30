import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-025.js";
import "../BT1/BT1-043.js";
import "./index.js";

describe("BT17-025", () => {
  it("plays a level 3 blue or purple Digimon from trash or digivolution cards and returns it", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
          bindResultAs: "playedLevel3",
        },
        {
          kind: "SubTrigger",
          event: "endOfOpponentTurn",
          once: true,
          on: { filter: { boundRef: "playedLevel3" }, count: 1 },
          actions: [{ kind: "Return", to: "hand", target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
  });

  it("grants itself Dark Animal and returns a level 3 opponent Digimon when yours is played", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Dark Animal"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }],
        },
      ],
    });
  });

  it("plays a level 3 Digimon from trash and returns it at the end of a complete opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
          trash: [{ card: "BT17-021", as: "revived" }],
          deck: ["BT1-011"],
          // BT17-021 has its own On Play placement cost; keep a legal neutral
          // level-3 blue card available so entry fully resolves before the
          // delayed return watcher is exercised.
          hand: [
            { card: "BT17-025", as: "werewolf" },
            { card: "BT1-029", as: "placement" },
          ],
        },
        // Keep the public Main phase open for the opponent's complete turn; this free card is
        // never played, so it cannot alter the delayed-return outcome.
        1: {
          // Keep the opponent's turn alive through its draw phase so the delayed
          // end-of-opponent-turn watcher actually gets its production boundary.
          deck: ["BT1-011"],
          battleArea: [{ card: "BT1-029", as: "opponentLevel3" }],
          hand: [{ card: "BT1-090", as: "opponentMainAction" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const revivedId = s.inst("revived").instanceId;
    const opponentId = s.perm("opponentLevel3").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("cerberusmon"), "Dark Animal")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === revivedId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === revivedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(false);
  });

  it("returns an opposing level 3 Digimon when an effect plays yours", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "host", under: ["BT17-025"] }],
          hand: [{ card: "BT17-021", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-029", as: "opponentLevel3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const opponentId = s.perm("opponentLevel3").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId));

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-029")).toBe(true);
  });
});
