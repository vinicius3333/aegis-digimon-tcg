import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_047 } from "./BT24-047.js";
import "../index.js";

describe("BT24-047 Kokatorimon", () => {
  it("keeps the unsuspend and follow-up attack on the same qualifying Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_047.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({ kind: "Unsuspend", condition: { kind: "lastSuspendedIsMine" } });
      expect(actions[2]).toMatchObject({
        kind: "Attack",
        condition: { kind: "ifThisEffectActed" },
        target: { sameTarget: true },
      });
    }
  });

  it("Q5636: suspending an opponent Digimon does not unlock the own-Digimon follow-up", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-047", as: "source" },
            { card: "ST1-02", as: "avian", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("avian").isSuspended).toBe(true);
  });

  it("suspends, unsuspends, and attacks with its own Giant Bird as one sequence", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-047", as: "source" }] },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("inherited effect gains memory only when its own host wins and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-048", as: "host", under: ["BT24-047"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 3;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("Q5637: inherited effect does not activate when its host is deleted in the same battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-048", as: "host", under: ["BT24-047"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
    });
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
    );

    expect(s.state.memory).toBe(3);
  });
});
