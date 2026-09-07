import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("public Link history", () => {
  it("trashes the existing link across separate public Link actions", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-070", as: "host" }],
          hand: [
            { card: "BT21-009", as: "oldLink" },
            { card: "BT21-047", as: "newLink" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.perm("host").permanentId;
    const oldLinkId = s.inst("oldLink").instanceId;
    const newLinkId = s.inst("newLink").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    preferred.splice(0, preferred.length, oldLinkId);
    expect(s.engine.applyIntent(0, { type: "linkCard", targetPermanentId: hostId, instanceId: oldLinkId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === oldLinkId) && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(4);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([oldLinkId]);

    preferred.splice(0, preferred.length, newLinkId);
    expect(s.engine.applyIntent(0, { type: "linkCard", targetPermanentId: hostId, instanceId: newLinkId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === newLinkId) && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([newLinkId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(oldLinkId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(newLinkId);
  });
});
