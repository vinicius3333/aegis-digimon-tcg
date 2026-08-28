import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-009.js";
import "../index.js";

describe("BT16-009", () => {
  it("has Raid and Armor Purge and gives an opposing Digimon -3000 DP when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Raid" }, { keyword: "Armor Purge" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("digivolves from Gatomon for 0 and gives one opposing Digimon -3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-037", as: "gatomon" }],
          hand: [{ card: "BT16-009", as: "lynxmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 6000 },
            { card: "BT1-009", as: "other", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gatomon").permanentId,
        instanceId: s.inst("lynxmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("gatomon").topCard?.cardId).toBe("BT16-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(7000);
  });

  it("uses Raid to redirect an attack to the highest-DP unsuspended opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-009", as: "attacker", dp: 8000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "highest", dp: 7000 },
            { card: "BT1-009", as: "lower", dp: 6000 },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    const lowerId = s.perm("lower").permanentId;
    const highestInstanceId = s.perm("highest").topCard.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === highestInstanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
  });

  it("uses Armor Purge to survive a natural losing battle by promoting its source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-009", as: "lynxmon", dp: 1000, under: [{ card: "BT1-009", as: "source" }] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 2000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const lynxmonInstanceId = s.perm("lynxmon").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("lynxmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lynxmon").topCard?.cardId === "BT1-009");

    expect(s.perm("lynxmon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === lynxmonInstanceId)).toBe(true);
  });
});
