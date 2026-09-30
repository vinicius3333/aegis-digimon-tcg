import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import {
  identityVisibility,
  placeAtStartOfMain,
  stackIds,
  trashBottomTamerCardWithFalcomon,
} from "./tamerStack.testSupport.js";
import { compiled } from "./BT26-095.js";
import "../index.js";

describe("BT26-095 compiled behavior", () => {
  it("maps Makoto's placement, deletion reaction, and Security clause", () => {
    expect(getCardDefinition("BT26-095")).toMatchObject({
      nameEn: "Makoto Kuonji",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["Glowing Dawn", "BEATBREAK"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
    });
  });

  it("publicly places BEATBREAK, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("makoto").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains the ordered Draw, hand trash, and non-Digi-Egg placement body", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(action).toMatchObject({
      actions: [
        {
          kind: "CostGatedBlock",
          actions: [{ kind: "Draw" }, { kind: "Trash" }, { kind: "PlaceUnder", faceDown: true }],
        },
      ],
    });
  });
});

describe("BT26-095 Makoto Kuonji — KB Q&A rulings", () => {
  const placeBeatbreak = () => placeAtStartOfMain("BT26-095", "P-236");

  it("places the paid card at the bottom of the face-down cards already under Makoto (Q7160)", async () => {
    const { s, placedId, finish } = await placeBeatbreak();

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
    await finish();
  });

  it("offers no reorder of the face-down cards, so a bottom-card cost trashes the placed card (Q7161)", async () => {
    const { s, placedId, priorIds, finish } = await placeBeatbreak();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    await finish();
  });

  it("lets only Makoto's owner look at the face-down card (Q7162)", async () => {
    const { s, finish } = await placeBeatbreak();

    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
    await finish();
  });

  it("puts a trashed face-down card from under Makoto face up in the trash (Q7163)", async () => {
    const { s, placedId, finish } = await placeBeatbreak();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await finish();
  });

  it.each([
    { makotoSuspended: false, drawn: true, placed: 1 },
    { makotoSuspended: true, drawn: false, placed: 0 },
  ])(
    "draws, trashes, and places the BEATBREAK card only after Makoto pays the suspend cost (suspended=$makotoSuspended) (Q7164)",
    async ({ makotoSuspended, drawn, placed }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT26-095", as: "makoto", suspended: makotoSuspended }],
            hand: [{ card: "BT1-010", as: "handCard" }],
            trash: [{ card: "P-236", as: "beatbreak" }],
            deck: [{ card: "BT1-011", as: "draw" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      expect(await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect")).toBe(1);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("draw").instanceId)).toBe(!drawn);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.perm("makoto").stack).toHaveLength(placed);
      expect(s.perm("makoto").stack.some(({ instanceId }) => instanceId === s.inst("beatbreak").instanceId)).toBe(
        placed === 1,
      );
    },
  );
});
