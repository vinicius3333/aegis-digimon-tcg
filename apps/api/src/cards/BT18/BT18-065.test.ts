import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT11/BT11-070.js";
import "./BT18-065.js";
import "./BT18-060.js";
import { compiled } from "./BT18-065.js";

describe("BT18-065 Snatchmon", () => {
  it("uses exactly four Vemmon slots and unlocks trash while there are no non-Vemmon Digimon", async () => {
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Vemmon"] }], count: 1, maxMaterials: 4 }]);
    expect(compiled.effects[0]?.actions[0]?.condition?.kind).toBe("youHaveNone");

    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmon" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("snatchmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("vemmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(s.state.players[0]!.battleArea[0]?.topCard?.cardId).toBe("BT18-065");
    expect(s.state.players[0]!.battleArea[0]?.stack.map((card) => card.cardId)).toContain("BT18-060");
    expect(s.state.memory).toBe(5);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("keeps trash locked when the player controls a non-Vemmon Digimon", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-057" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmon" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("snatchmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("vemmon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("places up to two Vemmon from trash under itself when digivolving", async () => {
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { from: ["trash"] },
      underFilter: { isSelfRef: true },
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-057", as: "base" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmonOne" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const optional = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(optional).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional!.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "selectCards"));
    const selection = s.decisions.find((decision) => decision.req.kind === "selectCards");
    expect(selection).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("vemmonOne").instanceId] },
      }),
    ).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await s.ready();
    expect(s.perm("base").topCard?.cardId).toBe("BT18-065");
    expect(s.perm("base").stack.filter((card) => card.cardId === "BT18-060")).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT18-060")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("may refuse its digivolving placement and never offers non-Vemmon or opposing trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-060", as: "base" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT1-009", as: "wrongName" }],
        },
        1: { trash: [{ card: "BT18-060", as: "opposingVemmon" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();

    // The original base becomes a source; refusal must not add the opposing Vemmon.
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT18-060"]);
    assertNoLoudGap(s);
  });

  it("pays to evolve at end of turn only with four sources and permits refusal", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-065", as: "qualified", under: ["BT18-060", "BT18-060", "BT18-060", "BT18-060"] }],
          hand: [{ card: "BT11-070", as: "destromon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    accepted.state.memory = 8;
    await accepted.ready();
    await advance(accepted.engine).runTurn(0);
    expect(accepted.perm("qualified").topCard?.instanceId).toBe(accepted.inst("destromon").instanceId);
    // Passing sets memory to -3. Four inherited Vemmon reductions lower the 5-cost
    // evolution to 1, so the outgoing gauge finishes at -4.
    expect(accepted.state.memory).toBe(-4);

    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-065", as: "qualified", under: ["BT18-060", "BT18-060", "BT18-060", "BT18-060"] }],
          hand: [{ card: "BT11-070", as: "destromon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    refused.state.memory = 8;
    await refused.ready();
    await advance(refused.engine).runTurn(0);
    expect(refused.perm("qualified").topCard?.cardId).toBe("BT18-065");
    // Refusing leaves the outgoing turn's pass marker at -3 in the next-player frame.
    expect(refused.state.memory).toBe(-3);
    assertNoLoudGap(accepted);
    assertNoLoudGap(refused);
  });

  it("does not offer end-turn evolution below four sources or from trash", async () => {
    const belowThreshold = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-065", as: "snatchmon", under: ["BT18-060", "BT18-060", "BT18-060"] }],
          hand: [{ card: "BT11-070", as: "handDestination" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    belowThreshold.state.memory = 8;
    await belowThreshold.ready();
    await advance(belowThreshold.engine).runTurn(0);
    expect(belowThreshold.perm("snatchmon").topCard?.cardId).toBe("BT18-065");
    expect(belowThreshold.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT11-070");
    expect(belowThreshold.decisions).toHaveLength(0);

    const trashOnly = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-065",
              as: "snatchmon",
              under: ["BT18-060", "BT18-060", "BT18-060", "BT18-060"],
            },
          ],
          trash: [{ card: "BT11-070", as: "trashDestination" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    trashOnly.state.memory = 8;
    await trashOnly.ready();
    await advance(trashOnly.engine).runTurn(0);
    expect(trashOnly.perm("snatchmon").topCard?.cardId).toBe("BT18-065");
    expect(trashOnly.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT11-070"]);
    expect(trashOnly.decisions).toHaveLength(0);
    assertNoLoudGap(belowThreshold);
    assertNoLoudGap(trashOnly);
  });

  it("inherits only from its host's returned Vemmon and triggers once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            suspended: true,
            under: [
              { card: "BT18-065" },
              { card: "BT18-060", as: "first" },
              { card: "BT18-060", as: "second" },
              { card: "BT1-009", as: "wrongName" },
            ],
          },
          { card: "BT1-009", as: "other", suspended: true, under: [{ card: "BT18-060", as: "otherVemmon" }] },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("otherVemmon").instanceId]);
    await advance(s.engine).verb.returnToDeck([s.inst("wrongName").instanceId]);
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.returnToDeck([s.inst("first").instanceId]);
    await settle(() => s.perm("host").isSuspended === false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    s.perm("host").isSuspended = true;
    await advance(s.engine).verb.returnToDeck([s.inst("second").instanceId]);
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
