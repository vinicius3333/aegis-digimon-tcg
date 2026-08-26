import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-016.js";

describe("BT14-016", () => {
  it("preserves its printed stats and Ceratopsian/Data identity", () =>
    expect(getCardDefinition("BT14-016")).toMatchObject({
      nameEn: "Triceramon",
      colors: ["Red"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 2 }],
      attributes: ["Data"],
      types: ["Ceratopsian"],
    }));

  it("has Raid", () =>
    expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({
      keyword: "Raid",
      raw: "＜Raid＞",
    }));

  it("exposes Raid on the battle-area Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-016", as: "triceramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("triceramon"), "Raid")).toBe(true);
  });

  it("may redirect onto only the highest-DP unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-016", as: "triceramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lower", dp: 5000 },
            { card: "BT1-020", as: "highest", dp: 6000 },
            { card: "BT14-068", as: "suspendedHigher", dp: 12000, suspended: true },
          ],
          security: ["BT1-085"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    const lowerId = s.perm("lower").permanentId;
    const suspendedId = s.perm("suspendedHigher").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("triceramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === suspendedId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-016")).toBe(true);
    assertNoLoudGap(s);
  });

  it("may decline Raid and continue the original player-directed attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-016", as: "triceramon" }] },
        1: { battleArea: [{ card: "BT14-068", as: "highest", dp: 12000 }], security: ["BT1-085"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("triceramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-016")).toBe(true);
    assertNoLoudGap(s);
  });
});
