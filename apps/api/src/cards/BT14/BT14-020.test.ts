import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-020.js";

describe("BT14-020", () => {
  it("preserves Gomamon's catalog identity and exact compiled contract", () => {
    expect(getCardDefinition("BT14-020")).toMatchObject({
      nameEn: "Gomamon",
      colors: ["Blue"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      attributes: ["Vaccine"],
      types: ["Sea Beast"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "StartOfYourMainPhase",
          actions: [
            { kind: "TrashDigivolution", amount: 1, choose: true },
            { kind: "Restrict", restriction: "beBlocked", duration: "forTheTurn" },
          ],
        },
        {
          trigger: "OpponentsTurn",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldBeDeleted",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "PlayWithoutCost",
                  from: ["digivolutionCards"],
                  payCost: false,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("lets the controller choose any opposing source and grants unblockable for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-020", as: "gomamon" }], security: ["BT1-001"] },
        1: {
          battleArea: [
            {
              card: "BT14-017",
              as: "target",
              under: [
                { card: "BT14-001", as: "bottom" },
                { card: "BT14-007", as: "chosen" },
                { card: "BT14-012", as: "topSource" },
              ],
            },
            { card: "BT14-011", as: "blocker" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    // Drive the real turn machine so the Start of Your Main Phase clauses originate from
    // the production phase transition rather than a direct timing injection.
    const turn = s.engine.runOneTurn();
    await settle(() => s.decisions.some((decision) => decision.req.kind === "selectCards"));
    const decision = s.decisions.find((entry) => entry.req.kind === "selectCards")!;
    if (decision.req.kind !== "selectCards") throw new Error("expected card-selection decision");
    expect(decision.req.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("bottom").instanceId,
        s.inst("chosen").instanceId,
        s.inst("topSource").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosen").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 2);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-012"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gomamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.decisions.some((entry) => (entry.req as { kind: string }).kind === "declareBlock")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("Q2390 grants unblockable even when no opposing source can be trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-020", as: "gomamon" }] },
      1: { battleArea: [{ card: "BT14-011", as: "blocker" }], security: ["BT1-001"] },
    });
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gomamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.decisions.some((entry) => (entry.req as { kind: string }).kind === "declareBlock")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("Q2391 plays the chosen Gomamon before deletion without triggering its inherited On Deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT14-024",
              as: "host",
              under: ["BT14-002", { card: "BT1-030", as: "otherGomamon" }, { card: "BT14-020", as: "source" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -2;
    await advance(s.engine).recompute();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-030")).toBe(true);
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-024")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not offer the inherited replacement on its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT14-024",
              as: "host",
              under: ["BT14-002", { card: "BT1-030", as: "otherGomamon" }, { card: "BT14-020", as: "source" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-030")).toBe(true);
    assertNoLoudGap(s);
  });
});
