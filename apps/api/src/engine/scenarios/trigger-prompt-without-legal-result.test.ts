import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/BT25/BT25-018";
import "#api/cards/AD1/AD1-003";
import { advance } from "#api/engine/testkit/advance";
import { type BoardSpec, settle, setupEngine } from "#api/engine/testkit/harness";

const APOLLOMON = "BT25-018";
const FILLER = "BT1-009";
const WARGROWLMON = "AD1-003";

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
  const shown =
    showPrompts === undefined
      ? { ok: true }
      : s.engine.applyIntent(0, { type: "showNothingToDoPrompts", show: showPrompts });
  expect(shown).toEqual({ ok: true });
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

describe("triggered costless optional delete with no legal target", () => {
  async function playWarGrowlmon(showPrompts?: boolean) {
    const s = setupEngine(
      {
        0: { hand: [{ card: WARGROWLMON, as: "wargrowlmon" }], deck: Array<string>(5).fill(FILLER) },
        1: { battleArea: [{ card: FILLER, as: "big", dp: 9000 }], deck: Array<string>(5).fill(FILLER) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const shown =
      showPrompts === undefined
        ? { ok: true }
        : s.engine.applyIntent(0, { type: "showNothingToDoPrompts", show: showPrompts });
    expect(shown).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    const prompts = s.decisions
      .map(({ req }) => req)
      .filter((req) => req.sourceCardId === WARGROWLMON && req.kind === "optional");
    return { s, prompts };
  }

  it("asks the opted-in seat about the delete too, and deletes nothing", async () => {
    const { s, prompts } = await playWarGrowlmon(true);

    expect(prompts).toHaveLength(2);
    expect(prompts.every((req) => req.options?.nothingToDo === true)).toBe(true);
    expect(s.perm("big").topCard.cardId).toBe(FILLER);
  });

  it("still skips both prompts for a seat that did not opt in", async () => {
    const { s, prompts } = await playWarGrowlmon();

    expect(prompts).toHaveLength(0);
    expect(s.perm("big").topCard.cardId).toBe(FILLER);
  });
});
