import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-070.js";

describe("EX8-070", () => {
  it("selects a Mineral/Rock Digimon with digivolution cards and gives it Collision, Piercing, Reboot, +3000 DP, and return protection", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "SelectBind", optional: true, cost: { kind: "trash" } });
    expect(actions.slice(1).map((action) => action.kind)).toEqual([
      "GainKeyword",
      "GainKeyword",
      "GainKeyword",
      "Restrict",
      "ModifyDP",
    ]);
    expect(actions[4]).toMatchObject({
      kind: "Restrict",
      restriction: "cannotReturnToHandOrDeck",
      byOpponentOnly: true,
    });
    expect(actions[5]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" });
  });
  it("contains the printed main and Security effects", () => expect(compiled.effects).toHaveLength(2));
  it("deletes the exact lowest-play-cost opposing Digimon when revealed in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-001", as: "attacker" },
            { card: "BT1-010", as: "lowest" },
            { card: "AD1-001", as: "higher" },
          ],
        },
        1: { security: [{ card: "EX8-070", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    const lowestInstanceId = s.perm("lowest").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => (s.state.players[0] as PlayerState).trash.some((card) => card.instanceId === lowestInstanceId));

    expect((s.state.players[0] as PlayerState).trash.some((card) => card.instanceId === lowestInstanceId)).toBe(true);
    expect(
      (s.state.players[0] as PlayerState).battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.perm("higher").topCard?.instanceId,
      ),
    ).toBe(true);
  });
  it("applies all five Main grants to the selected Mineral host after paying the stack cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "mineral", under: ["EX8-048"] }],
          hand: [{ card: "EX8-070", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const baseDP = s.perm("mineral").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mineral").stack.length === 0 && s.perm("mineral").currentDP === baseDP + 3000);

    expect(s.perm("mineral").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("mineral"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("mineral"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mineral"), "Reboot")).toBe(true);
    expect(s.perm("mineral").currentDP).toBe(baseDP + 3000);
    expect(observe(s.engine).hasRestriction(s.perm("mineral"), "beReturned")).toBe(true);
  });
  it("may decline without trashing a source or granting any benefit", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-047", as: "mineral", under: ["EX8-048"] }],
        hand: [{ card: "EX8-070", as: "option" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("mineral").stack).toHaveLength(1);
    expect(s.perm("mineral").currentDP).toBe(s.perm("mineral").baseDP);
    expect(observe(s.engine).hasKeyword(s.perm("mineral"), "Collision")).toBe(false);
  });
  it("blocks an opponent effect from returning the granted host to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "mineral", under: ["EX8-048"] }],
          hand: [{ card: "EX8-070", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasRestriction(s.perm("mineral"), "beReturned"));

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.returnToHand([s.perm("mineral").topCard.instanceId]);
    driver.verb.leaveEffectResolution();

    expect(s.perm("mineral").topCard.cardId).toBe("EX8-047");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("mineral").permanentId),
    ).toBe(true);
  });
});
