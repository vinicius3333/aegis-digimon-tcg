import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import {
  identityVisibility,
  placeAtStartOfMain,
  stackIds,
  trashBottomTamerCardWithFalcomon,
} from "./tamerStack.testSupport.js";
import { compiled } from "./BT26-093.js";
import "../index.js";

describe("BT26-093 compiled behavior", () => {
  it("maps Reina's placement, attack watcher, and Security clauses", () => {
    expect(getCardDefinition("BT26-093")).toMatchObject({
      nameEn: "Reina Sakuya",
      colors: ["Black"],
      kinds: ["Tamer"],
      types: ["Glowing Dawn", "BEATBREAK"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
    });
  });

  it("publicly places a BEATBREAK card, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-093", as: "reina" }],
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
    expect(s.perm("reina").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the attack grants together for one selected BEATBREAK Digimon", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(action).toMatchObject({
      actions: [
        {
          kind: "CostGatedBlock",
          actions: [
            { kind: "PlaceUnder" },
            { kind: "GainKeyword", keyword: { keyword: "Collision" }, keywords: [{ keyword: "Blocker" }] },
          ],
        },
      ],
    });
  });
});

describe("BT26-093 Reina Sakuya — KB Q&A rulings", () => {
  const placeBeatbreak = () => placeAtStartOfMain("BT26-093", "P-236");

  it("places the paid card at the bottom of the face-down cards already under Reina (Q7151)", async () => {
    const { s, placedId, finish } = await placeBeatbreak();

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
    await finish();
  });

  it("offers no reorder of the face-down cards, so a bottom-card cost trashes the placed card (Q7152)", async () => {
    const { s, placedId, priorIds, finish } = await placeBeatbreak();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    await finish();
  });

  it("lets only Reina's owner look at the face-down card (Q7153)", async () => {
    const { s, finish } = await placeBeatbreak();

    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
    await finish();
  });

  it("puts a trashed face-down card from under Reina face up in the trash (Q7154)", async () => {
    const { s, placedId, finish } = await placeBeatbreak();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await finish();
  });

  it.each([
    { reinaSuspended: false, placed: 1, granted: true },
    { reinaSuspended: true, placed: 0, granted: false },
  ])(
    "grants <Collision> and <Blocker> only after Reina pays the suspend cost (suspended=$reinaSuspended) (Q7155)",
    async ({ reinaSuspended, placed, granted }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT26-093", as: "reina", suspended: reinaSuspended },
              { card: "BT25-079", as: "attacker" },
            ],
            deck: ["BT1-009", "BT1-010"],
          },
          1: { security: ["BT1-011", "BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);

      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("reina").isSuspended).toBe(true);
      expect(s.perm("reina").stack).toHaveLength(placed);
      expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(granted);
      expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Blocker")).toBe(granted);
    },
  );
});
