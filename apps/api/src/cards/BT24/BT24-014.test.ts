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
        fromOwnDigivolutionStack: true,
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

  it("expires the -5000 DP reduction at the real opponent turn boundary", async () => {
    const s = setupEngine({
      0: { security: 4, battleArea: [{ card: "BT24-014", as: "aegiochusmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }], deck: ["BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("aegiochusmon"));
    expect(s.perm("target").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(7000);
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
              card: "ST1-10",
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

  it("allows explicit refusal of non-battle Decode and leaves the stack in trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", under: [{ card: "P-194", as: "aegiomon" }] }] },
      },
      { autoDeclineOptional: true },
    );
    const hostId = s.perm("host").permanentId;
    const hostCardId = s.perm("host").topCard.instanceId;
    const sourceId = s.inst("aegiomon").instanceId;
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([hostCardId, sourceId]));
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

  it("inherits Decode through public evolution and plays Aegiomon from that leaving stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST2-16", as: "cocytus" }],
          battleArea: [{ card: "BT12-032", as: "blueSource" }],
        },
        1: {
          battleArea: [
            {
              card: "BT24-014",
              as: "host",
              under: [{ card: "P-194", as: "source" }],
            },
            {
              card: "BT24-014",
              as: "neighbor",
              under: [{ card: "P-194", as: "neighborSource" }],
            },
          ],
          hand: [{ card: "ST1-10", as: "levelSix" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );

    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("levelSix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("levelSix").instanceId);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["P-194", "BT24-014"]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([
      s.inst("source").instanceId,
      s.inst("host").instanceId,
    ]);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual([s.inst("neighborSource").instanceId]);

    s.state.turnSeat = 0;
    s.state.memory = 7;
    await s.engine.recomputeContinuousEffects();
    preferred.push(s.perm("host").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cocytus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-194"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["P-194", "BT24-014"]),
    );
    expect(
      s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "P-194")!.topCard.instanceId,
    ).toBe(s.inst("source").instanceId);
    expect(
      s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-014")!.topCard.instanceId,
    ).toBe(s.inst("neighbor").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("host").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("levelSix").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("neighborSource").instanceId)).toBe(
      false,
    );
  });

  it("checks two opposing security cards through the public attack intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-014", as: "attacker", under: [{ card: "P-194", as: "aegiomon" }] }],
        deck: ["BT1-013", "BT1-015", "BT1-045"],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
  });
});
