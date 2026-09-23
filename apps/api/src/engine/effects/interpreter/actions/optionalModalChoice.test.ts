import { describe, expect, it } from "vitest";
import { EffectTiming, type Action, type CompiledCard } from "@aegis/shared";
import "../../../../cards/index.js";
import { registerIrCard, runtimeCompiledCard } from "../../interpreter.js";
import { advance } from "../../../testkit/advance.js";
import { setupEngine } from "../../../testkit/harness.js";

const CARD_ID = "BT1-009";
const BASE_DP = 3000;

const modifySelfDP = (amount: number): Action => ({
  kind: "ModifyDP",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  amount,
  duration: "forTheTurn",
});

const optionalModal = (options: Action[][], extra: Partial<Extract<Action, { kind: "Modal" }>> = {}): Action => ({
  kind: "Modal",
  choose: 1,
  optional: true,
  labels: options.map((_, index) => `Option ${index + 1}`),
  options,
  ...extra,
});

async function withOncePerTurnOnPlay(actions: Action[], run: () => Promise<void>): Promise<void> {
  const original = runtimeCompiledCard(CARD_ID);
  if (original === undefined) throw new Error(`${CARD_ID} must be registered by cards/index.js`);
  const compiled: CompiledCard = {
    effects: [{ trigger: "OnPlay", frequency: "OncePerTurn", actions }],
    coverage: "full",
    residual: [],
  };
  registerIrCard(CARD_ID, compiled);
  try {
    await run();
  } finally {
    registerIrCard(CARD_ID, original);
  }
}

describe("optional choose-1 modal", () => {
  it("asks one chooseOption whose last entry declines", async () => {
    await withOncePerTurnOnPlay([optionalModal([[modifySelfDP(1000)], [modifySelfDP(2000)]])], async () => {
      const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } }, { preferOptionIndex: 1 });

      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

      expect(s.decisions.map(({ req }) => req.kind)).toEqual(["chooseOption"]);
      expect(s.decisions[0]!.req.options).toMatchObject({
        choices: ["Option 1", "Option 2", "Don't use"],
        declineIndex: 2,
      });
      expect(s.perm("source").currentDP).toBe(BASE_DP + 2000);
    });
  });

  it("treats the decline entry as declining and keeps the once-per-turn opportunity", async () => {
    await withOncePerTurnOnPlay([optionalModal([[modifySelfDP(1000)], [modifySelfDP(2000)]])], async () => {
      const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } }, { autoDeclineOptional: true });
      const fire = advance(s.engine);

      await fire.fire(EffectTiming.OnPlay, s.perm("source"));
      await fire.fire(EffectTiming.OnPlay, s.perm("source"));

      expect(s.decisions.map(({ req }) => req.kind)).toEqual(["chooseOption", "chooseOption"]);
      expect(s.perm("source").currentDP).toBe(BASE_DP);
    });
  });

  it("spends the once-per-turn opportunity when an option is chosen", async () => {
    await withOncePerTurnOnPlay([optionalModal([[modifySelfDP(1000)], [modifySelfDP(2000)]])], async () => {
      const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } }, { autoChooseOption: true });
      const fire = advance(s.engine);

      await fire.fire(EffectTiming.OnPlay, s.perm("source"));
      await fire.fire(EffectTiming.OnPlay, s.perm("source"));

      expect(s.decisions.map(({ req }) => req.kind)).toEqual(["chooseOption"]);
      expect(s.perm("source").currentDP).toBe(BASE_DP + 1000);
    });
  });

  it("stops the rest of the effect when an abortOnDecline modal is declined", async () => {
    await withOncePerTurnOnPlay(
      [optionalModal([[modifySelfDP(1000)], [modifySelfDP(2000)]], { abortOnDecline: true }), modifySelfDP(5000)],
      async () => {
        const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } }, { autoDeclineOptional: true });

        await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

        expect(s.perm("source").currentDP).toBe(BASE_DP);
      },
    );
  });

  it("keeps the yes/no prompt when only one option is available", async () => {
    await withOncePerTurnOnPlay(
      [optionalModal([[modifySelfDP(1000)], [{ kind: "RawUnparsed", text: "unavailable" }]])],
      async () => {
        const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } }, { autoAcceptOptional: true });

        await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

        expect(s.decisions.map(({ req }) => req.kind)).toEqual(["optional"]);
        expect(s.perm("source").currentDP).toBe(BASE_DP + 1000);
      },
    );
  });
});
