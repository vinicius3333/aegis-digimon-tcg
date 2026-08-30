import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-036.js";
import "./BT18-019.js";

describe("BT18-036 Wizardmon", () => {
  it("limits inherited prevention to opponent effects and the yellow Data/Witchelny filter", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: {
            colors: ["Yellow"],
            nameOrTrait: [{ tokens: ["Data", "Witchelny"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("trashes the exact top security card, draws, and gains 1 memory when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
          deck: [
            { card: "BT1-011", as: "evolutionDraw" },
            { card: "BT1-012", as: "effectDraw" },
          ],
          hand: [{ card: "BT18-036", as: "wizardmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("effectDraw").instanceId) &&
        s.state.memory === 4,
    );

    expect(s.perm("lucemon").topCard?.instanceId).toBe(s.inst("wizardmon").instanceId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-034"]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(4);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("may decline without trashing security, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [
            { card: "BT1-011", as: "evolutionDraw" },
            { card: "BT1-012", as: "notDrawn" },
          ],
          hand: [{ card: "BT18-036", as: "wizardmon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("prevents a natural opponent-effect deletion by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-036"] }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { hand: [{ card: "BT18-019", as: "opponentRemover" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentRemover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-036")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("inherits once-per-turn protection against an opponent effect for a yellow Data host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-036"] }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
