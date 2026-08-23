import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-014.js";
import "../index.js";

describe("BT24-014 Aegiochusmon", () => {
  it("applies the DP reduction then conditionally deletes at three or fewer security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
    expect(effect.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "zoneCount", zone: "security", op: "lte", value: 3 },
    });
  });

  it("implements Decode by playing Aegiomon from the stack on non-battle removal", () => {
    const decodeEffects = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(decodeEffects).toHaveLength(2);
    expect(decodeEffects.some((effect) => effect.isInherited)).toBe(true);
    for (const effect of decodeEffects) {
      const replacement = effect.actions?.[0] as any;
      expect(replacement).toMatchObject({
        kind: "Replacement",
        event: "wouldLeavePlay",
        leaveCause: "otherThanBattle",
      });
      expect(replacement.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        optional: true,
        playedByDecode: true,
      });
    }
  });

  it("reduces DP before conditionally deleting at three security", async () => {
    const s = setupEngine(
      {
        0: {
          security: 3,
          battleArea: [{ card: "BT24-014", as: "aegiochusmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("aegiochusmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("does not perform the deletion with four security cards", async () => {
    const s = setupEngine(
      {
        0: {
          security: 4,
          battleArea: [{ card: "BT24-014", as: "aegiochusmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("aegiochusmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("uses top-card Decode to play Aegiomon and still removes Aegiochusmon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", under: [{ card: "P-194", as: "aegiomon" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-194"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("aegiomon").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-014");
  });

  it("uses inherited Decode when its host leaves outside battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-011",
              as: "host",
              under: ["BT24-014", { card: "P-194", as: "aegiomon" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-194"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("aegiomon").instanceId,
    );
  });

  it("does not Decode from a battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", under: [{ card: "P-194", as: "aegiomon" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
  });

  it("digivolves from Aegiomon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-194", as: "aegiomon" }],
        hand: [{ card: "BT24-014", as: "aegiochusmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("aegiochusmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard.instanceId === s.inst("aegiochusmon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
