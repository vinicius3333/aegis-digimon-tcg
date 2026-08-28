import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-077.js";
import "./BT13-011.js";

describe("BT13-077 Craniamon", () => {
  it("grants Blocker and opponent-Digimon effect immunity through the opponent's turn", () => {
    expect(
      compiled.effects
        ?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))
        .every((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Blocker")),
    ).toBe(true);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        actions: [
          {
            kind: "GrantStatic",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            grant: "immuneToOpponentDigimonEffects",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
  });

  it("redirects an opponent's end-of-turn attack after choosing a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      actions: [
        {
          kind: "RedirectAttack",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    });
  });

  it("installs opponent Digimon-effect immunity when played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-077", as: "craniamon", dp: 3000 }] },
        1: { hand: [{ card: "BT13-011", as: "opponentEffect" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("craniamon"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("craniamon").permanentId)).toBe(true);
  });
});
