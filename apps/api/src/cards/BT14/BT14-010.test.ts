import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-010.js";

describe("BT14-010", () =>
  it("has Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    })));

it("exposes Jamming on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-010", as: "kokatorimon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("kokatorimon"), "Jamming")).toBe(true);
});

it("survives a losing Security Digimon battle from a legal red evolution stack", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "BT14-007", as: "agumon", under: ["BT14-001"] },
      hand: [{ card: "BT14-010", as: "kokatorimon" }],
      deck: ["BT1-001"],
    },
    1: { security: ["BT14-101"] },
  });
  s.state.memory = 5;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("kokatorimon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("agumon").topCard.cardId === "BT14-010");
  expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-007"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("agumon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("agumon").inBreeding);
  s.state.phase = Phase.Main;
  const attackerId = s.perm("agumon").permanentId;
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

it("is still deleted when it loses a normal Digimon battle", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-010", as: "attacker" }] },
    1: { battleArea: [{ card: "BT14-101", as: "defender", suspended: true }] },
  });
  const attackerId = s.perm("attacker").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  assertNoLoudGap(s);
});
