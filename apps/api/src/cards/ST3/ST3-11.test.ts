import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-105.js";
import "./ST3-05.js";
import "./ST3-11.js";

describe("ST3-11 Seraphimon", () => {
  it("gives an opposing Digimon -4000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] },
        1: { battleArea: [{ card: "ST3-07", as: "target" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("deletes a 4000 DP attack target before battle and survives", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] },
        1: { battleArea: [{ card: "ST3-07", as: "target", dp: 4000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});

describe("ST3-11 Seraphimon — KB Q&A rulings", () => {
  async function attackPlayerTargetingDigimonWithDp(targetDp: number) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] },
        1: { battleArea: [{ card: "ST3-03", as: "target", dp: targetDp }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const targetInstanceId = s.inst("target").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    return { s, targetInstanceId };
  }

  it("deletes an opponent's 4000 DP Digimon by reducing it to 0 DP (Q637)", async () => {
    const lethal = await attackPlayerTargetingDigimonWithDp(4000);
    expect(lethal.s.state.players[1]!.battleArea).toHaveLength(0);
    expect(lethal.s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(lethal.targetInstanceId);

    const survivor = await attackPlayerTargetingDigimonWithDp(5000);
    expect(survivor.s.state.players[1]!.battleArea).toHaveLength(1);
    expect(survivor.s.perm("target").currentDP).toBe(1000);
  });

  it("ends the attack without a battle once the attacked Digimon is deleted, after other When Attacking effects resolve (Q638)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-11", as: "seraphimon", under: ["ST3-05"] }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST3-03", as: "target", suspended: true },
            { card: "ST3-03", as: "bystander", suspended: true },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, preferTriggerKeys: ["ST3-11"] },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const targetInstanceId = s.inst("target").instanceId;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());

    const targetDeletedAt = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetInstanceId) && event.to === "trash",
    );
    const angemonMemoryAt = s.events.findIndex(
      (event) => event.kind === "memoryChanged" && event.reason === "gainMemory",
    );
    expect(targetDeletedAt).toBeGreaterThanOrEqual(0);
    expect(angemonMemoryAt).toBeGreaterThan(targetDeletedAt);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(false);
    expect(s.perm("bystander").currentDP).toBe(4000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("seraphimon").permanentId,
    ]);
  });

  it("cannot reduce the DP of a Digimon that blocks after its When Attacking effect resolved (Q639)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", as: "seraphimon" }] },
        1: {
          battleArea: [
            { card: "ST3-07", as: "blocker", dp: 12000 },
            { card: "ST3-03", as: "bystander" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("bystander").topCard.instanceId);
    const seraphimonId = s.perm("seraphimon").permanentId;
    const bystanderInstanceId = s.inst("bystander").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: seraphimonId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(bystanderInstanceId);
    expect(s.perm("blocker").currentDP).toBe(12000);

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("blocker").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("blocker").permanentId,
    ]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === seraphimonId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("deletes a Digimon whose original DP was changed to 3000 when its DP drops to 0 (Q973)", async () => {
    function setupBlastFireBoard() {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST3-11", as: "seraphimon" }],
            hand: [{ card: "BT1-105", as: "blastFire" }],
          },
          1: { battleArea: [{ card: "ST3-07", as: "target", suspended: true }], security: ["BT1-009"] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }
    async function attackPlayer(s: ReturnType<typeof setupBlastFireBoard>) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("seraphimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    }

    const changed = setupBlastFireBoard();
    expect(
      changed.engine.applyIntent(0, { type: "playCard", instanceId: changed.inst("blastFire").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => changed.perm("target").currentDP === 3000);
    await attackPlayer(changed);
    expect(changed.state.players[1]!.battleArea).toHaveLength(0);
    expect(changed.state.players[1]!.trash.map((card) => card.instanceId)).toContain(changed.inst("target").instanceId);

    const unchanged = setupBlastFireBoard();
    await attackPlayer(unchanged);
    expect(unchanged.state.players[1]!.battleArea).toHaveLength(1);
    expect(unchanged.perm("target").currentDP).toBe(2000);
  });
});
