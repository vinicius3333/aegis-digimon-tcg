import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/BT25/BT25-018";
import { advance } from "#api/engine/testkit/advance";
import { type BoardSpec, settle, setupEngine } from "#api/engine/testkit/harness";

const APOLLOMON = "BT25-018";
const FILLER = "BT1-009";

async function endTurnWithApollomon({ showPrompts, accept }: { showPrompts?: boolean; accept: boolean }) {
  const board: BoardSpec = {
    0: {
      battleArea: [{ card: APOLLOMON, as: "apollomon", suspended: true }],
      hand: [FILLER],
      deck: Array<string>(5).fill(FILLER),
    },
    1: {
      battleArea: [{ card: FILLER, as: "defender", suspended: true }],
      security: [FILLER, FILLER, FILLER],
      deck: Array<string>(5).fill(FILLER),
    },
  };
  const s = setupEngine(board, { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true });
  await s.ready();
  if (showPrompts !== undefined)
    expect(s.engine.applyIntent(0, { type: "showNothingToDoPrompts", show: showPrompts })).toEqual({ ok: true });
  await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
  await settle(() => s.state.pendingDecision === undefined);
  const prompts = s.decisions
    .map(({ req }) => req)
    .filter((req) => req.sourceCardId === APOLLOMON && req.kind === "optional");
  return { s, prompts };
}

describe("triggered optional effect with no legal result", () => {
  it.each([true, false])(
    "shows each prompt flagged nothing-to-do to a seat that opted in (accept=%s)",
    async (accept) => {
      const { s, prompts } = await endTurnWithApollomon({ showPrompts: true, accept });

      expect(prompts).toHaveLength(2);
      expect(prompts.every((req) => req.options?.nothingToDo === true)).toBe(true);
      expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.perm("apollomon").topCard.cardId).toBe(APOLLOMON);
    },
  );

  it.each([undefined, false])("skips the prompts for a seat that did not opt in (show=%s)", async (showPrompts) => {
    const { s, prompts } = await endTurnWithApollomon({ showPrompts, accept: true });

    expect(prompts).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });
});
