import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-074.js";

describe("BT10-074 Quetzalmon", () => {
  it("uses Armor Purge to survive deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-074", as: "source", under: ["BT10-071"] }] } },
      { autoSelectCards: false },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const armorId = s.perm("source").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;
    expect(request.options).toMatchObject({ min: 0, max: 1, candidateInstanceIds: [armorId] });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [armorId] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("source").permanentId),
    ).toBe(true);
    expect(s.perm("source").topCard.cardId).toBe("BT10-071");
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === armorId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows declining Armor Purge so the whole permanent is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-074", as: "source", under: ["BT10-071"] }] } },
      { autoSelectCards: false },
    );
    const sourceId = s.perm("source").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT10-074", "BT10-071"]),
    );
    assertNoLoudGap(s);
  });

  it("is deleted without a prompt when it has no digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-074", as: "source" }] } });

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
