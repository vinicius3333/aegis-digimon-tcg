import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-026.js";

describe("BT8-026 Halsemon", () => {
  it("deletes an opposing level 3 Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-026", as: "halsemon" }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("halsemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("digivolves from Hawkmon for 2, deletes only level 3, and can Armor Purge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-009", as: "hawkmon" }],
          hand: [{ card: "BT8-026", as: "halsemon" }],
        },
        1: {
          battleArea: [
            { card: "BT8-041", as: "defender", suspended: true },
            { card: "BT8-033", as: "levelThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const hawkmonId = s.perm("hawkmon").topCard.instanceId;
    const defenderPermanentId = s.perm("defender").permanentId;
    const levelThreePermanentId = s.perm("levelThree").permanentId;
    const halsemonInstanceId = s.inst("halsemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("halsemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hawkmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.instanceId === hawkmonId);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderPermanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelThreePermanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === halsemonInstanceId)).toBe(true);
  });
});
