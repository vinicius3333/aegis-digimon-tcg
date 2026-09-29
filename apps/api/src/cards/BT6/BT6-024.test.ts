import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { PermanentSpec } from "../../engine/testkit/harness.js";
import "./BT6-024.js";

describe("BT6-024 Mojyamon", () => {
  it("gains Jamming while the opponent has no Digimon with sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-024", as: "mojyamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mojyamon"), "Jamming")).toBe(true);
  });

  it("trashes the bottom source of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", under: ["BT6-024"], as: "host" }] },
        1: {
          battleArea: [
            {
              card: "BT6-016",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "top" },
              ],
              as: "target",
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId)).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});

async function attackSecurityMetalGreymon(opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT6-024", as: "mojyamon" }] },
    1: { battleArea: opponentBattleArea, security: [{ card: "BT1-021", as: "securityDigimon" }] },
  });
  const attackerId = s.perm("mojyamon").permanentId;
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() =>
    s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("securityDigimon").instanceId),
  );
  await settle();
  return s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId);
}

describe("BT6-024 Mojyamon — KB Q&A rulings", () => {
  it("gains Jamming and survives a stronger Security Digimon when the opponent has no Digimon at all (Q1417)", async () => {
    expect(await attackSecurityMetalGreymon([])).toBe(true);
    expect(await attackSecurityMetalGreymon([{ card: "BT1-014", under: ["BT1-010"] }])).toBe(false);
  });
});
