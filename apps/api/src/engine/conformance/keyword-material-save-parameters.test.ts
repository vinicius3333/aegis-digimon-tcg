import { beforeEach, describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Material Save public deletion placement", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0239",
      "§16-21-1 through §16-21-5: Material Save places the specified DigiXros materials under one Tamer when the host is deleted",
      "4027cd3c1ccbcae22b1af6d72fe235bfc8903c9ab7b8a9e2224320aeee9af19a",
    );
    cite(
      "comprehensive-0240",
      "§16-21-6: newly saved cards are placed at the bottom of an existing Tamer stack",
      "79ff27d489362dce2d549edf91834566d980dd47798e8cf810f4df8a3f4fd2db",
    );
  });
  it("accepts Material Save 1 and saves exactly one eligible source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-009",
              as: "host",
              under: [
                { card: "BT10-008", as: "shoutmon" },
                { card: "BT10-029", as: "starmons" },
              ],
            },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceIds = [s.inst("shoutmon").instanceId, s.inst("starmons").instanceId];
    const hostId = s.perm("host").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === hostId));
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(sourceIds).toContain(s.perm("tamer").stack[0]!.instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([hostId, sourceIds.find((id) => id !== s.perm("tamer").stack[0]!.instanceId)!]),
    );
  });

  it("accepts Material Save 4 and saves four of six eligible sources", async () => {
    const cards = ["BT11-015", "BT11-031", "BT10-049", "BT10-034", "BT10-029", "BT10-060"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-019", as: "host", under: cards.map((card, index) => ({ card, as: `source${index}` })) },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceIds = cards.map((_, index) => s.inst(`source${index}`).instanceId);
    const hostId = s.perm("host").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === hostId));
    expect(s.perm("tamer").stack).toHaveLength(4);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(sourceIds.slice(0, 4)),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([hostId, ...sourceIds.slice(4)]),
    );
  });

  it("accepts Material Save 2 and places the exact eligible materials under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-025",
              as: "host",
              under: [
                { card: "BT19-020", as: "source1" },
                { card: "BT19-022", as: "source2" },
              ],
            },
            { card: "BT19-081", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceIds = [s.inst("source1").instanceId, s.inst("source2").instanceId];
    const hostId = s.perm("host").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === hostId));
    expect(
      s
        .perm("tamer")
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual(sourceIds.sort());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([hostId]);
  });

  it("refuses Material Save when no Tamer exists and trashes the host and materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-025",
              as: "host",
              under: [
                { card: "BT19-020", as: "source1" },
                { card: "BT19-022", as: "source2" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ids = [s.perm("host").topCard.instanceId, s.inst("source1").instanceId, s.inst("source2").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(ids.sort());
  });

  it("honors an explicit public refusal when an eligible Tamer is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-025",
              as: "host",
              under: [
                { card: "BT19-020", as: "source1" },
                { card: "BT19-022", as: "source2" },
              ],
            },
            { card: "BT19-081", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      {},
    );
    await s.ready();
    const ids = [s.perm("host").topCard.instanceId, s.inst("source1").instanceId, s.inst("source2").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const refusal = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(ids.sort());
  });

  it("accepts the printed Material Save 3 maximum and preserves all selected source identities", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-013",
              as: "host",
              under: [
                { card: "BT10-008", as: "shoutmon" },
                { card: "BT10-049", as: "ballistamon" },
                { card: "BT10-034", as: "dorulumon" },
                { card: "BT10-029", as: "starmons" },
                { card: "BT10-060", as: "sparrowmon" },
              ],
            },
            { card: "BT10-087", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceIds = ["shoutmon", "ballistamon", "dorulumon", "starmons", "sparrowmon"].map(
      (alias) => s.inst(alias).instanceId,
    );
    const hostId = s.perm("host").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === hostId));
    expect(
      s
        .perm("tamer")
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual(sourceIds.slice(0, 3).sort());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(sourceIds.slice(3)),
    );
  });
});
