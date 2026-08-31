import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-003.js";

describe("BT20-003 Bibimon", () => {
  it("proves the inherited end-of-turn placement is optional and once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      target: { count: 1 },
      targetIsPermanent: true,
      position: "bottom",
      underFilter: { kind: ["Digimon"], isSelfRef: true, digivolutionStackKindExclude: ["Tamer"] },
    });
  });

  it("places a qualifying field Tamer at this Digimon's bottom only when its stack has no Tamer", async () => {
    const eligible = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-011", as: "host", under: ["BT20-003", "BT20-004"] },
            { card: "BT20-089", as: "socTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(eligible.engine).fire(EffectTiming.OnEndTurn, eligible.perm("host"));
    expect(eligible.perm("host").stack.map((card) => card.cardId)).toEqual(["BT20-089", "BT20-003", "BT20-004"]);
    expect(eligible.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-089")).toBe(
      false,
    );

    const blocked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-011", as: "blockedHost", under: ["BT20-089", "BT20-003"] },
            { card: "BT17-086", as: "eligibleTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(blocked.engine).fire(EffectTiming.OnEndTurn, blocked.perm("blockedHost"));
    expect(blocked.perm("blockedHost").stack.map((card) => card.cardId)).toEqual(["BT20-089", "BT20-003"]);
    expect(blocked.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(
      true,
    );
  });
});
