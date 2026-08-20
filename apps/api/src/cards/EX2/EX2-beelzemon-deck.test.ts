import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-111.js";
import "./EX2-039.js";
import "./EX2-040.js";
import "./EX2-043.js";
import "./EX2-074.js";

describe("BT10-era Beelzemon deck", () => {
  it("chains an externally milled Impmon into Blast Mode's deck-trash deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "miller", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-039", as: "milledImpmon" },
            { card: "EX2-074", as: "milledBlastMode" },
            "BT1-001",
            "BT1-002",
            "BT1-003",
          ],
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "levelFour" },
            { card: "EX2-023", as: "levelFive" },
          ],
          security: ["BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferOptionIndex: 2,
      },
    );
    const levelFourId = s.perm("levelFour").permanentId;
    const levelFiveId = s.perm("levelFive").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("miller").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some((card) =>
        card.instanceId === s.inst("milledBlastMode").instanceId
      ) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFourId)
    );

    expect(s.state.players[1]!.battleArea.some((permanent) =>
      permanent.permanentId === levelFiveId
    )).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("chains the Impmon shortcut through both SEC Beelzemon forms and attacks three security", async () => {
    const trash = Array.from({ length: 20 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-039", as: "impmon" }],
          hand: [
            { card: "BT2-111", as: "classicBeelzemon" },
            { card: "EX2-074", as: "blastMode" },
          ],
          trash,
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "levelFour" },
            { card: "EX2-023", as: "levelFive" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const levelFourPermanentId = s.perm("levelFour").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("impmon").permanentId,
      instanceId: s.inst("classicBeelzemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("impmon").topCard.instanceId === s.inst("classicBeelzemon").instanceId &&
      !s.state.players[1]!.battleArea.some((permanent) =>
        permanent.permanentId === levelFourPermanentId,
      ) &&
      s.perm("impmon").currentDP === 14_000,
    5000);

    expect(s.state.memory).toBe(6);
    expect(s.perm("impmon").currentDP).toBe(14_000);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("impmon").permanentId,
      instanceId: s.inst("blastMode").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("impmon").topCard.instanceId === s.inst("blastMode").instanceId &&
      s.state.players[1]!.battleArea.length === 0 &&
      s.perm("impmon").currentDP === 18_000,
    5000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("impmon").currentDP).toBe(18_000);
    expect(observe(s.engine).keywordAmount(s.perm("impmon"), "SecurityAttack")).toBe(2);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("impmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
