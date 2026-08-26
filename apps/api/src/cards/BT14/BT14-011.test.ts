import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-011.js";

describe("BT14-011", () =>
  it("has Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    })));

it("exposes Blocker on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-011", as: "monochromon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("monochromon"), "Blocker")).toBe(true);
});

it("legally evolves, suspends to block a player attack, and preserves security", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-014", as: "attacker", dp: 7000 }] },
    1: {
      breeding: { card: "BT14-007", as: "agumon", under: ["BT14-001"] },
      hand: [{ card: "BT14-011", as: "monochromon" }],
      deck: ["BT1-001"],
      security: ["BT1-001"],
    },
  });
  s.state.turnSeat = 1;
  s.state.memory = 5;
  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("monochromon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("agumon").topCard.cardId === "BT14-011");
  expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-007"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("agumon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("agumon").inBreeding);
  s.state.turnSeat = 0;
  s.state.phase = Phase.Main;
  const blockerId = s.perm("agumon").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
  expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
  await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

  expect(s.state.players[1]!.security).toHaveLength(1);
  assertNoLoudGap(s);
});
