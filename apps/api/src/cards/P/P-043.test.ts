import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-043.js";

type EngineInternals = {
  primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> };
};

describe("P-043 Kudamon", () => {
  it("returns Kentaurosmon and recovers the deck top", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-043", as: "source" }], trash: [{ card: "BT3-043", as: "kent" }], deck: [{ card: "BT1-009", as: "top" }], security: ["BT1-028"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === s.inst("top").instanceId));
    expect(s.state.players[0]!.security.some((c) => c.instanceId === s.inst("top").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("kent").instanceId);
  });

  it("allows declining the Kentaurosmon return and therefore does not recover", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-043", as: "source" }],
          trash: [{ card: "BT3-043", as: "kent" }],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-028"],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("kent").instanceId]);

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("kent").instanceId)).toBe(true);
  });

  it("does not recover when no Kentaurosmon can be returned", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-043", as: "source" }],
          trash: ["BT1-009"],
          deck: [{ card: "BT1-010", as: "top" }],
          security: ["BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("uses its inherited On Deletion to give an opponent Digimon -1000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "host", under: ["P-043"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await (s.engine as unknown as EngineInternals).primitives.deletePermanent([hostId], "byEffect");
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.perm("target").currentDP).toBe(2000);
  });
});
