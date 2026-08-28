import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import "./BT5-079.js";
import "../BT10/BT10-073.js";

describe("BT5-079 BlackWarGrowlmon", () => {
  it("Digi-Bursts 3 to play a purple level 3 without its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-079", as: "growl", under: ["BT5-076", "BT5-071", "BT5-073"] }],
          trash: [{ card: "BT10-073", as: "rookie" }],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const sourceIds = s.perm("growl").stack.map(({ instanceId }) => instanceId);
    const source = internalsOf(s.engine).cardSourceOf(s.perm("growl").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-079/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("growl").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rookie").instanceId),
    );

    expect(s.perm("growl").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(sourceIds));
  });

  it("pays Digi-Burst 3 before declining the optional play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-079", as: "growl", under: ["BT5-076", "BT5-071", "BT5-073"] }],
          trash: [{ card: "BT10-073", as: "rookie" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const sourceIds = s.perm("growl").stack.map(({ instanceId }) => instanceId);
    const source = internalsOf(s.engine).cardSourceOf(s.perm("growl").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-079/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("growl").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growl").stack.length === 0);

    expect(s.perm("growl").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(false);
  });

  it("deletes another own Digimon to unsuspend its host, which can attack again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-081", as: "host", under: ["BT5-079"] },
            { card: "BT5-073", as: "cost" },
            { card: "BT5-073", as: "secondCost" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combat = internalsOf(s.engine).combat;
    const costPermanentId = s.perm("cost").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 1 && !combat.isAttacking);

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === costPermanentId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 0 && !combat.isAttacking);
    expect(
      s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === s.perm("secondCost").permanentId),
    ).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend when no other Digimon can be deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-081", as: "host", under: ["BT5-079"] }] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 0);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("may decline deleting another own Digimon to unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-081", as: "host", under: ["BT5-079"] },
            { card: "BT5-073", as: "candidate" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 0);

    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("candidate").permanentId),
    ).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
