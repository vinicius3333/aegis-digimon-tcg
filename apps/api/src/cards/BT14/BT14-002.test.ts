import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-002.js";

describe("BT14-002", () =>
  it("inherits conditional Jamming when no opposing Digimon has as many or more sources", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          condition: { kind: "opponentHasNone", filter: { digivolutionCardsCompareToSource: "gte" } },
        },
      ],
    })));

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

it("keeps a legally evolved blue stack in play after losing a security battle with the errata condition met", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "BT14-002", as: "bukamon" },
      hand: [{ card: "BT14-019", as: "otamamon" }],
      deck: ["BT1-001"],
    },
    1: {
      battleArea: [{ card: "BT14-007", as: "fewerSources" }],
      security: ["BT14-101"],
    },
  });
  s.state.memory = 3;
  s.state.turnSeat = 0;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("bukamon").permanentId,
      instanceId: s.inst("otamamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("bukamon").topCard.cardId === "BT14-019");
  expect(s.perm("bukamon").stack.map((card) => card.cardId)).toEqual(["BT14-002"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("bukamon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("bukamon").inBreeding);
  s.state.phase = Phase.Main;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bukamon"));
  expect(observe(s.engine).hasKeyword(s.perm("bukamon"), "Jamming")).toBe(true);

  const attackerId = s.perm("bukamon").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  assertNoLoudGap(s);
});
