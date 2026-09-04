import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-070.js";
import "./EX5-070.js";
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

  it("returns a Digimon stack card and places Proto Form in security on a public leave", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX5-070", "BT1-009"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.security[0]?.cardId).toBe("EX5-070");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });

  it("returns Proto Form from security through its public Security timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX5-070", as: "securityProto" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityProto"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX5-070"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-070");
  });
});
