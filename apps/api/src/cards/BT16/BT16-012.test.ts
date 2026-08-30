import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-012.js";
import "../index.js";

describe("BT16-012", () => {
  it("has Partition and reduces an opposing Digimon by 7000 during DNA digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Partition" }] });
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Red", level: 4 },
          { color: "Yellow", level: 4 },
        ],
      },
    ]);
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -7000, condition: { kind: "isDnaDigivolving" } }],
    });
  });
  it("deletes 4000 DP or lower opposing Digimon when digivolving or attacking", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 4000 } } } }],
    }));

  it("DNA digivolves unsuspended, reduces an opponent by 7000, then deletes a 4000 DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-008", as: "redMaterial" },
            { card: "BT16-031", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "reducedTo2000", dp: 9000 },
            { card: "BT1-009", as: "alreadyUnder4000", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-012") &&
        s.state.players[1]!.battleArea.length === 1,
    );

    const silphymon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-012");
    expect(silphymon?.isSuspended).toBe(false);
    expect(silphymon?.stack.map((card) => card.cardId)).toEqual(["BT16-008", "BT16-031"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("alreadyUnder4000").permanentId);
  });

  it("does not apply the -7000 clause on a normal red evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-008", as: "redMaterial" }],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redMaterial").permanentId,
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redMaterial").topCard?.cardId === "BT16-012");

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes exactly one opposing Digimon at 4000 DP or less when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-012", as: "silphymon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 4000 },
            { card: "BT1-009", as: "aboveLimit", dp: 4001 },
          ],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("silphymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("aboveLimit").permanentId);
  });
});
