import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-070.js";
import "../index.js";

describe("EX5-070 X Antibody Proto Form", () => {
  it("registers static color waiver, security return, and Main X Antibody evolution effects", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]?.kind).toBe(
      "WaiveColorRequirement",
    );
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]?.kind).toBe("AddToHandSelf");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]?.kind).toBe("Digivolve");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      target: {
        filter: {
          digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact", negate: true }],
        },
      },
      bindResultAs: "ex5-070-digivolved",
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[1]).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
      underFilter: { controller: "mine", boundRef: "ex5-070-digivolved" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["X Antibody"],
    });
  });
  it("registers the inherited leave-field return and security placement effect", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          leaveCause: "otherThanYourEffect",
          actions: [
            { kind: "Return" },
            {
              kind: "SecurityManipulation",
              source: {
                filter: {
                  nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("excludes own-effect leaves and keeps the first stack return mandatory before security placement", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    if (replacement?.kind !== "Replacement") throw new Error("EX5-070 inherited replacement missing");
    if (replacement.actions === undefined) throw new Error("EX5-070 replacement actions missing");
    expect(replacement.leaveCause).toBe("otherThanYourEffect");
    expect(replacement.actions[0]).toMatchObject({ kind: "Return", to: "hand" });
    expect(replacement.actions[0]).not.toHaveProperty("optional");
    expect(replacement.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "addTop" });
  });

  it("digivolves through the public Main intent and places Proto Form under the new Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "other" },
            { card: "BT1-010", as: "base" },
          ],
          hand: [
            { card: "EX5-070", as: "option" },
            { card: "BT9-011", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT9-011");
    expect(s.perm("base").topCard?.cardId).toBe("BT9-011");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX5-070");
    expect(s.perm("other").stack.map((card) => card.cardId)).not.toContain("EX5-070");
    expect(s.state.memory).toBe(0);
  });

  it("rejects a Proto Form stack as a Main target through the public intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "base", under: ["EX5-070"] }],
          hand: [
            { card: "EX5-070", as: "option" },
            { card: "BT9-011", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("base").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT9-011");
  });

  it("returns a Digimon stack card and places Proto Form in security after a public battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX5-070", "BT1-009"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }] },
    });
    const hostId = s.perm("host").permanentId;
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.security[0]?.cardId).toBe("EX5-070");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("activates with only Proto Form in the stack (Q3680)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX5-070"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }] },
    });
    const hostId = s.perm("host").permanentId;
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "EX5-070"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security[0]?.cardId).toBe("EX5-070");
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("returns Proto Form from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX5-070", as: "securityProto" }] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX5-070"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-070");
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
