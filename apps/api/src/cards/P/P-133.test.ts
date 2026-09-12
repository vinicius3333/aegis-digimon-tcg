import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-133.js";

describe("P-133 Shoto Kazama", () => {
  it("suspends this Tamer and gains memory when your Digimon digivolves into Avian", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-133", as: "shoto" },
            { card: "BT10-071", as: "host" },
          ],
          hand: [{ card: "BT13-082", as: "peckmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("peckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("peckmon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("peckmon").instanceId);
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
    assertNoLoudGap(s);
  });

  it("plays Pteromon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-133", as: "shoto" },
            { card: "P-131", as: "pteromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoto").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-133", as: "shoto" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shoto"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoto").instanceId)).toBe(true);
  });

  it("uses the digivolution watcher once per turn and resets on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-133", as: "shoto" },
            { card: "BT10-071", as: "host1" },
            { card: "BT10-071", as: "host2" },
            { card: "BT10-071", as: "host3" },
          ],
          hand: [
            { card: "BT13-082", as: "avian1" },
            { card: "BT13-082", as: "avian2" },
            { card: "BT13-082", as: "avian3" },
            { card: "P-131", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const digivolve = async (host: string, card: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(host).permanentId,
          instanceId: s.inst(card).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.perm(host).topCard.instanceId === s.inst(card).instanceId && s.state.pendingDecision === undefined,
      );
      expect(s.perm(host).stack.map(({ instanceId }) => instanceId)).toEqual([s.inst(host).instanceId]);
    };

    await digivolve("host1", "avian1");
    expect(s.state.memory).toBe(9);
    expect(s.perm("shoto").isSuspended).toBe(true);
    const memoryAfterFirst = s.state.memory;

    await advance(s.engine).verb.unsuspend([s.perm("shoto").permanentId]);
    await digivolve("host2", "avian2");
    expect(s.perm("shoto").isSuspended).toBe(false);
    expect(s.state.memory).toBe(memoryAfterFirst - 2);

    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("shoto").isSuspended).toBe(false);

    const memoryBeforeThird = s.state.memory;
    await digivolve("host3", "avian3");
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeThird - 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
