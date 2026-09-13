import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/BT14/index.js";

const MIND_LINK_FINGERPRINT = "40b7489c5fee5659b483448f6a0f627602c208034e95125c3ec57a9985121078";

describe("Mind Link public boundaries", () => {
  it("chooses one eligible Digimon and excludes a target that already has a Tamer", async () => {
    cite(
      "comprehensive-0247",
      "§16-28-1/2/3: mandatory Mind Link places its Tamer source under a Digimon with no Tamer cards",
      MIND_LINK_FINGERPRINT,
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "eligible" },
            { card: "BT14-058", as: "eligibleTwo" },
            { card: "BT14-058", as: "occupied", under: ["BT14-086"] },
          ],
          hand: [{ card: "BT14-086", as: "linker" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    const linkerId = s.inst("linker").instanceId;
    const eligibleId = s.perm("eligible").permanentId;
    const eligibleTwoId = s.perm("eligibleTwo").permanentId;
    const occupiedId = s.perm("occupied").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: linkerId })).toEqual({ ok: true });
    await settle(() => s.perm("linker").topCard.instanceId === linkerId);
    const memoryBefore = s.state.memory;
    const linker = s.perm("linker");
    const entry = observe(s.engine)
      .activatableEffects(linker)
      .find((candidate) => candidate.instanceId === linkerId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: linkerId, effectKey: entry!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson ?? "{}");
    expect(payload.candidateInstanceIds).toEqual(expect.arrayContaining([eligibleId, eligibleTwoId]));
    expect(payload.candidateInstanceIds).toHaveLength(2);
    expect(payload.candidateInstanceIds).not.toContain(occupiedId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [eligibleTwoId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === linker.permanentId),
    );
    expect(s.perm("eligibleTwo").stack[0]?.instanceId).toBe(linkerId);
    expect(s.perm("eligibleTwo").stack.filter((card) => card.instanceId === linkerId)).toHaveLength(1);
    expect(s.perm("eligible").permanentId).toBe(eligibleId);
    expect(s.perm("eligibleTwo").permanentId).toBe(eligibleTwoId);
    expect(s.perm("occupied").permanentId).toBe(occupiedId);
    expect(s.perm("occupied").stack.some((card) => card.cardId === "BT14-086")).toBe(true);
    expect(s.perm("occupied").stack.filter((card) => card.cardId === "BT14-086")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(linkerId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(linkerId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === linker.permanentId)).toBe(false);
  });
});
