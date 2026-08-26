import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-062.js";
import "./index.js";

describe("BT18-062 Gladimon", () => {
  it("trashes a Knightmon-text card to protect an own Digimon from opponent deletion", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 2)).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Restrict", byOpponentEffectsOnly: true }] },
    ]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "protectedDigimon" }],
          hand: [
            { card: "BT18-062", as: "gladimon" },
            { card: "BT18-099", as: "knightmonText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protectedDigimon"), "beDeleted"));

    expect(observe(s.engine).isRestricted(s.perm("protectedDigimon"), "beDeleted")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("knightmonText").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);

    s.state.turnSeat = 1;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("protectedDigimon").permanentId], "byEffect")).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("protectedDigimon").permanentId),
    ).toBe(true);
    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("protectedDigimon").permanentId], "byEffect")).toBe(1);
    assertNoLoudGap(s);
  });

  it("may refuse or be unavailable without paying or granting protection", async () => {
    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "target" }],
          hand: [
            { card: "BT18-062", as: "gladimon" },
            { card: "BT18-099", as: "candidate" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(
      refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("gladimon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => refused.state.pendingDecision === undefined);
    expect(refused.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT18-099"]);
    expect(observe(refused.engine).isRestricted(refused.perm("target"), "beDeleted")).toBe(false);

    const unavailable = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "target" }],
        hand: [
          { card: "BT18-062", as: "gladimon" },
          { card: "BT1-010", as: "wrong" },
        ],
      },
    });
    expect(
      unavailable.engine.applyIntent(0, { type: "playCard", instanceId: unavailable.inst("gladimon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => unavailable.state.players[0]!.battleArea.length === 2);
    expect(unavailable.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(observe(unavailable.engine).isRestricted(unavailable.perm("target"), "beDeleted")).toBe(false);
    assertNoLoudGap(refused);
    assertNoLoudGap(unavailable);
  });

  it("pays and grants the same protection when digivolving for two", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-059", as: "base" },
            { card: "BT1-030", as: "target" },
          ],
          hand: [
            { card: "BT18-062", as: "gladimon" },
            { card: "BT18-099", as: "cost" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    preferred.push(s.perm("target").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gladimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "beDeleted"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT18-099")).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants inherited +1000 DP only to its host on both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-062"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
