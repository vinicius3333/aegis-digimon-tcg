import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT21-042.js";
import "../index.js";

describe("BT21-042 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves the Agumon Dinosaur alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], traits: ["Dinosaur"], cost: 2, isAlternate: true },
    ]);
  });

  it("once per turn offers a free yellow RizeGreymon evolution when a Marcus Damon is played", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }],
        },
        actions: [
          {
            kind: "Digivolve",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              nameOrTrait: [{ tokens: ["RizeGreymon"], match: "name" }],
            },
            payCost: false,
            from: ["hand"],
            optional: true,
          },
        ],
      },
    ]);
  });

  it("preserves the inherited +2000 DP Your Turn modifier", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    );
  });

  it("plays through the public intent and exposes the +2000 DP Your Turn modifier", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-042", as: "geogreymon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geogreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("geogreymon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("geogreymon").instanceId)?.currentDP,
    ).toBe(5000);
  });

  it("evolves from a level-3 Dinosaur with Agumon in its name for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-011", as: "agumonExpert" }],
        hand: [{ card: "BT21-042", as: "geogreymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumonExpert").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumonExpert").topCard.cardId === "BT21-042");

    expect(s.state.memory).toBe(1);
    expect(s.perm("agumonExpert").stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("plays Marcus Damon and digivolves into a yellow RizeGreymon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-042", as: "geogreymon" }],
          hand: [
            { card: "BT21-086", as: "marcus" },
            { card: "BT21-044", as: "rizegreymon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("geogreymon").topCard.cardId === "BT21-044");

    expect(s.state.memory).toBe(6);
    expect(s.perm("geogreymon").stack.map((card) => card.cardId)).toEqual(["BT21-042"]);
  });

  it("consumes its once-per-turn trigger after a public refusal and ignores a second Marcus play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-042", as: "geogreymon" }],
          hand: [
            { card: "BT4-092", as: "firstMarcus" },
            { card: "BT4-092", as: "secondMarcus" },
            { card: "BT21-044", as: "rizegreymon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.length > 0);
    const refusal = s.decisions.at(-1)!.req;
    expect(refusal.kind).toBe("optional");
    if (refusal.kind !== "optional") throw new Error("expected optional first trigger decision");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("geogreymon").topCard.cardId).toBe("BT21-042");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT4-092").length === 2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("geogreymon").topCard.cardId).toBe("BT21-042");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rizegreymon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("ignores a public Marcus Damon played by the opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-042", as: "geogreymon" }], hand: [{ card: "BT21-044", as: "rizegreymon" }] },
        1: { hand: [{ card: "BT21-086", as: "opponentMarcus" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT21-086"));
    expect(s.perm("geogreymon").topCard.cardId).toBe("BT21-042");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rizegreymon").instanceId);
  });

  it("does not trigger from a combined Marcus Damon card name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-042", as: "geogreymon" }],
          hand: [
            { card: "AD1-021", as: "nearMarcus" },
            { card: "BT21-044", as: "rizegreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nearMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-021"));

    expect(s.perm("geogreymon").topCard.cardId).toBe("BT21-042");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rizegreymon").instanceId)).toBe(true);
  });

  it("ignores an opponent's Marcus Damon and an unrelated own Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-042", as: "geogreymon" },
          { card: "BT1-089", as: "ownTamer" },
        ],
        hand: [{ card: "BT21-044", as: "rizegreymon" }],
      },
      1: { battleArea: [{ card: "BT21-086", as: "opponentMarcus" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opponentMarcus").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownTamer").permanentId,
    });

    expect(s.perm("geogreymon").topCard.cardId).toBe("BT21-042");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rizegreymon").instanceId);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-044", as: "host", under: ["BT21-042"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 9000 : 7000);
    }
  });
});
