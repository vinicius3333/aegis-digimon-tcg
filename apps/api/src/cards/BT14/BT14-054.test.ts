import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-054.js";
import { cite } from "../../engine/conformance/_kb.js";

describe("BT14-054", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0169",
      "§15-7-1/2/3: By processing conditions are optional, refusal skips the payload, and payment is whole",
      "255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b",
    );
    cite(
      "comprehensive-0170",
      "§15-7-4/5: a player may choose the condition even when impossible, and may pay without a payload target",
      "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
    );
  });

  it("has Piercing and suspends an opposing Digimon by unsuspending itself on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      keywords: [{ keyword: "Piercing" }],
      actions: [{ kind: "Suspend", cost: { kind: "unsuspend", target: { isSelf: true } } }],
    }));
  it("attacks an opposing Digimon at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      optional: true,
      actions: [
        { kind: "Attack", attackPlayer: false, mandatory: true, target: { filter: { controller: "opponent" } } },
      ],
    }));

  it("unsuspends itself as cost and suspends an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.isSuspended));
    expect(s.state.players[1]!.battleArea.some((p) => p.isSuspended)).toBe(true);
  });

  it.each([true, false])("publicly %s the processing condition with no opposing Digimon", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const baseId = s.perm("base").topCard.instanceId;
    const saberId = s.inst("saber").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").isSuspended).toBe(!accept);
    expect(s.perm("base").topCard).toMatchObject({ cardId: "BT14-054", instanceId: saberId });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(saberId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("naturally attacks the opposing Digimon from the real end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-054" && s.perm("target").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(true);
  });
});
