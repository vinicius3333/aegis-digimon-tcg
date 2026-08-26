import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-009.js";

describe("BT14-009", () =>
  it("restricts both players from playing Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "RestrictPlay",
          seat: "any",
          mode: "play",
          byEffectOnly: true,
          filter: { kind: ["Digimon"] },
          duration: "permanent",
        },
      ],
    })));

it("allows ordinary Digimon play but blocks Digimon effect-play for both players and permits Tamers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT14-009", as: "gotsumon" }],
      hand: [
        { card: "BT14-007", as: "ordinary" },
        { card: "BT14-008", as: "ownEffectDigimon" },
        { card: "BT1-085", as: "effectTamer" },
      ],
    },
    1: { hand: [{ card: "BT14-007", as: "opponentEffectDigimon" }] },
  });
  s.state.turnSeat = 0;
  s.state.memory = 10;
  await s.engine.recomputeContinuousEffects();

  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("ordinary").instanceId,
    }),
  ).toEqual({ ok: true });

  await advance(s.engine).verb.playInstances([s.inst("ownEffectDigimon").instanceId], "BT14-038");
  await advance(s.engine).verb.playInstances([s.inst("opponentEffectDigimon").instanceId], "BT14-038");
  await advance(s.engine).verb.playInstances([s.inst("effectTamer").instanceId], "BT14-038");

  expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ownEffectDigimon").instanceId)).toBe(true);
  expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentEffectDigimon").instanceId)).toBe(
    true,
  );
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-085")).toBe(true);
  assertNoLoudGap(s);
});
