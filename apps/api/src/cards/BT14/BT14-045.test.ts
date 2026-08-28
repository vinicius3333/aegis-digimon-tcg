import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-045.js";

describe("BT14-045", () =>
  it("has Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    })));

it("exposes Jamming on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-045", as: "kuwagamon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("kuwagamon"), "Jamming")).toBe(true);
});

it("naturally survives losing a Security battle because of Jamming", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-045", as: "kuwagamon", dp: 1000 }] },
    1: { security: ["BT1-081"] },
  });
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("kuwagamon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("kuwagamon").permanentId)).toBe(true);
});
