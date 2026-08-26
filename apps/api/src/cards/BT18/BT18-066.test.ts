import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-049.js";
import "./BT18-064.js";
import "./BT18-066.js";

describe("BT18-066 Sephirothmon", () => {
  it("uses its normal black level-3 evolution route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-059", as: "base" }],
        hand: [{ card: "BT18-066", as: "sephirothmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sephirothmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-066");
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-059");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    assertNoLoudGap(s);
  });

  it("places a level-4 Hybrid from trash and activates that card's On Play effect", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-030", as: "target" },
            { card: "BT18-064", as: "base" },
          ],
          hand: [{ card: "BT18-066", as: "sephirothmon" }],
          trash: [{ card: "BT18-049", as: "hybrid", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    const targetInitialDP = s.perm("target").currentDP;
    preferredInstanceIds.push(s.perm("target").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sephirothmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard?.cardId === "BT18-066" &&
          permanent.stack.some((card) => card.instanceId === s.inst("hybrid").instanceId),
      ),
    );
    const sephirothmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-066")!;

    expect(sephirothmon.topCard?.cardId).toBe("BT18-066");
    expect(sephirothmon.stack.find((card) => card.instanceId === s.inst("hybrid").instanceId)?.faceUp).toBe(true);
    expect(sephirothmon.stack.filter((card) => card.instanceId === s.inst("hybrid").instanceId)).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(false);
    await settle(() => s.perm("target").currentDP === targetInitialDP + 3000);
    expect(s.perm("target").currentDP).toBe(targetInitialDP + 3000);
    expect(s.state.memory).toBe(9);
    assertNoLoudGap(s);
  });

  it("plays for 6, places an eligible hand Hybrid, and activates only that card's On Play", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "target" }],
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-049", as: "hybrid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    const targetInitialDP = s.perm("target").currentDP;
    preferredInstanceIds.push(s.inst("hybrid").instanceId, s.perm("target").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sephirothmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetInitialDP + 3000);
    const sephirothmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-066")!;
    expect(sephirothmon.stack.filter(({ instanceId }) => instanceId === s.inst("hybrid").instanceId)).toHaveLength(1);
    expect(s.state.memory).toBe(4);
    expect(s.perm("target").currentDP).toBe(targetInitialDP + 3000);
    assertNoLoudGap(s);
  });

  it("may refuse and does not offer self, wrong-trait, or opposing cards", async () => {
    const refused = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-049", as: "eligible" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    refused.state.memory = 10;
    expect(
      refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("sephirothmon").instanceId }),
    ).toEqual({ ok: true });
    await refused.ready();
    const refusedHost = refused.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT18-066")!;
    expect(refusedHost.stack).toHaveLength(0);
    expect(refused.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT18-049");

    const unavailable = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-066", as: "sephirothmon" },
            { card: "BT18-066", as: "excludedSelf" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
        },
        1: { trash: [{ card: "BT18-049", as: "opposingHybrid" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    unavailable.state.memory = 10;
    expect(
      unavailable.engine.applyIntent(0, { type: "playCard", instanceId: unavailable.inst("sephirothmon").instanceId }),
    ).toEqual({ ok: true });
    await unavailable.ready();
    const unavailableHost = unavailable.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === unavailable.inst("sephirothmon").instanceId,
    )!;
    expect(unavailableHost.stack).toHaveLength(0);
    expect(unavailable.decisions).toHaveLength(0);
    assertNoLoudGap(refused);
    assertNoLoudGap(unavailable);
  });

  it("grants inherited +2000 DP only to its host on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-066"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
