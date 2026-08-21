import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-002.js";

describe("BT14-002", () => it("inherits conditional Jamming when no opposing Digimon has as many or more sources", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "Jamming" }, condition: { kind: "opponentHasNone", filter: { digivolutionCardsCompareToSource: "gte" } } }] })));

it("grants Jamming when the opponent has no Digimon", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "bukamon", under: ["BT14-002"] }] },
    1: {},
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bukamon"));

  expect(observe(s.engine).hasKeyword(s.perm("bukamon"), "Jamming")).toBe(true);
});

it("does not grant Jamming when an opposing Digimon has an equal source count", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-007", as: "bukamon", under: ["BT14-002"] }] },
    1: { battleArea: [{ card: "BT14-007", as: "equal", under: ["BT14-001"] }] },
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bukamon"));

  expect(observe(s.engine).hasKeyword(s.perm("bukamon"), "Jamming")).toBe(false);
});
