import { expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-044.js";

it("gains Security Attack for each opposing Digimon with that keyword", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT12-017", as: "emperor" }] },
  });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("lamp"), "SecurityAttack")).toBe(true);
});

it("counts every opposing Digimon affected by Security Attack", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: {
      battleArea: [
        { card: "BT12-017", as: "first" },
        { card: "BT12-017", as: "second" },
      ],
    },
  });
  await s.ready();
  expect(observe(s.engine).keywordAmount(s.perm("lamp"), "SecurityAttack")).toBe(2);
});

it("does not gain Security Attack when no opposing Digimon has that keyword", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT1-009", as: "plain" }] },
  });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("lamp"), "SecurityAttack")).toBe(false);
});

it("gives one opposing Digimon Security Attack -2 when digivolving", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target" }] },
  });
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lamp"));
  expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  await s.ready();
  expect(observe(s.engine).keywordAmount(s.perm("lamp"), "SecurityAttack")).toBe(1);
});

it("resolves the digivolution debuff through a public digivolution intent", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-057", as: "base" }], hand: [{ card: "BT12-044", as: "lamp" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lamp").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard?.cardId === "BT12-044");
  expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  expect(s.state.memory).toBe(0);
});
