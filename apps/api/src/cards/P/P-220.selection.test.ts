import type { DecisionResponse, Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-220.js";

const deDigivolveClause = "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon.";
const deleteClause = "Then, you may delete 1 Digimon.";

describe.each([0, 1] as const)("GitHub #5347 P-220 public selections, seat %i", (seat) => {
  async function play(mode: "multiple" | "source-less" | "single-stack" | "empty") {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine({
      [seat]: {
        hand: [{ card: "P-220", as: "source" }],
        battleArea: [{ card: "BT1-010", as: "own" }],
      },
      [opponent]: {
        battleArea:
          mode === "empty"
            ? []
            : mode === "source-less"
              ? [{ card: "BT16-027", as: "first" }]
              : [
                  { card: "BT1-080", as: "first", under: ["BT1-009", "BT1-070", "BT1-020"] },
                  ...(mode === "multiple" ? [{ card: "BT1-011", as: "second" }] : []),
                ],
      },
    });
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    // The harness answers numeric De-Digivolve amounts through respondDecision.
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.decisions.find(({ req }) => req.kind === "chooseOption")!.req.options?.effectTextPart).toBe(
      deDigivolveClause,
    );
    function respond(response: DecisionResponse) {
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response,
        }),
      ).toEqual({ ok: true });
    }
    return { s, opponent, respond };
  }

  it.each(["second", "own", "skip"])("chooses De-Digivolve independently from deletion: %s", async (selection) => {
    const { s, opponent, respond } = await play("multiple");
    const first = s.perm("first").permanentId;
    const second = s.perm("second").permanentId;
    const own = s.perm("own").permanentId;
    const deDecision = s.decisions.at(-1)!.req;
    expect(deDecision.options).toMatchObject({ min: 1, max: 1, effectTextPart: deDigivolveClause });
    expect(deDecision.options?.candidateInstanceIds).toEqual([first, second]);
    respond({ kind: "chooseTargets", instanceIds: [first] });
    await settle(() => s.state.pendingDecision?.decisionId !== deDecision.decisionId);
    expect(s.perm("first").topCard.cardId).toBe("BT1-070");
    expect(s.state.players[opponent]!.trash.map((c) => c.cardId)).toEqual(["BT1-080", "BT1-020"]);
    expect(s.decisions.at(-1)!.req.options).toMatchObject({
      min: 0,
      max: 1,
      targetFate: "delete",
      purpose: "optionalTarget",
      effectTextPart: deleteClause,
    });
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual(expect.arrayContaining([first, second, own]));
    respond({ kind: "chooseTargets", instanceIds: selection === "skip" ? [] : [selection === "own" ? own : second] });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("first").topCard.cardId).toBe("BT1-070");
    expect(s.state.players[opponent]!.battleArea.some((p) => p.permanentId === second)).toBe(selection !== "second");
    expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === own)).toBe(selection !== "own");
  });

  it.each(["source-less", "single-stack", "empty"] as const)(
    "preserves the deletion choice after automatic De-Digivolve: %s",
    async (mode) => {
      const { s, opponent, respond } = await play(mode);
      expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
      expect(s.decisions.at(-1)!.req.options).toMatchObject({
        min: 0,
        max: 1,
        targetFate: "delete",
        purpose: "optionalTarget",
        effectTextPart: deleteClause,
      });
      const expectedOpponent = {
        "source-less": [{ card: "BT16-027", sources: 0 }],
        "single-stack": [{ card: "BT1-070", sources: 1 }],
        empty: [],
      };
      expect(
        s.state.players[opponent]!.battleArea.map((p) => ({ card: p.topCard.cardId, sources: p.stack.length })),
      ).toEqual(expectedOpponent[mode]);
      expect(s.state.players[opponent]!.trash.map((c) => c.cardId)).toEqual(
        mode === "single-stack" ? ["BT1-080", "BT1-020"] : [],
      );
      const target = s.perm(mode === "empty" ? "own" : "first").permanentId;
      respond({ kind: "chooseTargets", instanceIds: [target] });
      await settle(() => s.state.pendingDecision === undefined);
      expect(
        s.state.players[mode === "empty" ? seat : opponent]!.battleArea.some((p) => p.permanentId === target),
      ).toBe(false);
    },
  );
});
