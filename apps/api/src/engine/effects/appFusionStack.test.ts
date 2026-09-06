import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";

import "../../cards/index.js";

describe("App Fusion stack placement", () => {
  it("moves the linked Navimon above Gatchmon into the DoGatchmon stack through Haru", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [
            { card: "BT21-047", as: "partner" },
            { card: "BT21-018", as: "result" },
          ],
          deck: [
            { card: "BT1-001", as: "haruDraw" },
            { card: "BT1-002", as: "fusionDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: partnerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard.instanceId === resultId &&
        s.perm("host").linked.length === 0 &&
        s.perm("haru").isSuspended,
    );

    expect(s.perm("host").topCard.cardId).toBe("BT21-018");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009", "BT21-047"]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === partnerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === resultId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it("moves the linked Gatchmon above Navimon into the same App Fusion stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-047", as: "host" },
          ],
          hand: [
            { card: "BT21-009", as: "partner" },
            { card: "BT21-018", as: "result" },
          ],
          deck: [
            { card: "BT1-001", as: "haruDraw" },
            { card: "BT1-002", as: "fusionDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: partnerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard.instanceId === resultId &&
        s.perm("host").linked.length === 0 &&
        s.perm("haru").isSuspended,
    );

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-047", "BT21-009"]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === partnerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === resultId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it("leaves App Fusion hand and link zones unchanged when digivolution is restricted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-047", as: "partner" }] }],
          hand: [{ card: "BT21-018", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    await s.ready();

    // This is the named ledger seam for arming an active production restriction. App Fusion
    // must consult the same digivolve gate as an ordinary evolution before moving any card.
    advance(s.engine).ledgers.continuous.addRestriction(hostId, "digivolve", EffectDuration.Permanent);

    const outcome = await advance(s.engine).verb.appFuseInto(hostId, resultId);

    expect(outcome).toBeUndefined();
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([partnerId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([resultId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === partnerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === resultId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
  it("moves only the chosen partner when a mechanism grant permits two links", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: "BT21-047", as: "retained" },
                { card: "P-190", as: "chosen" },
              ],
            },
          ],
          hand: [{ card: "BT21-018", as: "result" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const id = s.perm("host").permanentId;
    // A runtime capacity grant isolates the shared partner-choice mechanism; the
    // public single-partner cases above prove the actual BT21 card routes.
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(id, 1, EffectDuration.Permanent);
    preferred.push(s.inst("chosen").instanceId);
    await s.ready();
    await advance(s.engine).verb.appFuseInto(id, s.inst("result").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009", "P-190"]);
    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["BT21-047"]);
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
