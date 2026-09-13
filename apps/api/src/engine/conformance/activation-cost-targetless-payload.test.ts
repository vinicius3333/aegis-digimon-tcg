import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/BT19/BT19-086.js";
import "../../cards/P/P-155.js";

const fingerprint = "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97";

describe("§15-7-5 targetless payload after a paid compound cost", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0170",
      "§15-7-5 permits payment of an optional processing condition even when its subsequent payload has no eligible target",
      fingerprint,
    ),
  );

  it("pays BT19-086's four-Device compound cost when no Cyberdramon exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo" },
            { card: "BT1-009", as: "host", dp: 3000 },
            { card: "P-155", as: "device0" },
            { card: "P-155", as: "device1" },
            { card: "P-155", as: "device2" },
            { card: "P-155", as: "device3" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-009"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const ryoId = s.perm("ryo").permanentId;
    const hostId = s.perm("host").permanentId;
    const deviceIds = ["device0", "device1", "device2", "device3"].map((alias) => s.perm(alias).topCard.instanceId);

    const effects = JSON.parse(s.perm("ryo").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effects.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("ryo").topCard!.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 4);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("ryo").permanentId).toBe(ryoId);
    expect(s.perm("ryo").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([...deviceIds].sort());
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([ryoId, hostId]);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX3-050")).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
