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
import { compiled } from "./BT26-091.js";
import "../index.js";

describe("BT26-091 compiled behavior", () => {
  it("matches Yoshino's catalog and compiled clauses", () => {
    expect(getCardDefinition("BT26-091")).toMatchObject({
      nameEn: "Yoshino Fujieda",
      colors: ["Green"],
      kinds: ["Tamer"],
      types: ["DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" }),
        expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed" }),
      ]),
    );
  });

  it("publicly places DATA SQUAD at the bottom, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino", under: [{ card: "BT1-009", as: "old", faceUp: false }] }],
          hand: [{ card: "BT26-044", as: "dataSquad" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("yoshino").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("dataSquad").instanceId,
      s.inst("old").instanceId,
    ]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines the optional placement without changing hand or stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino" }],
          hand: [{ card: "BT26-044", as: "dataSquad" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("yoshino").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("dataSquad").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains both public reactive clauses in the compiled card", () => {
    const actions = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenSuspended", actions: [expect.objectContaining({ kind: "Digivolve" })] }),
        expect.objectContaining({
          event: "whenDigivolutionTrashed",
          actions: [expect.objectContaining({ kind: "Digivolve" })],
        }),
      ]),
    );
  });
});

describe("BT26-091 Yoshino Fujieda — KB Q&A rulings", () => {
  const placeDataSquad = () => placeAtStartOfMain("BT26-091", "BT26-044");

  it("places the paid card at the bottom of the face-down cards already under Yoshino (Q7144)", async () => {
    const { s, placedId, finish } = await placeDataSquad();

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: placedId, faceUp: false });
    await finish();
  });

  it("offers no reorder of the face-down cards, so a bottom-card cost trashes the placed card (Q7145)", async () => {
    const { s, placedId, priorIds, finish } = await placeDataSquad();
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed?.instanceId).toBe(placedId);
    expect(stackIds(s.perm("tamer"))).toEqual(priorIds);
    await finish();
  });

  it("lets only Yoshino's owner look at the face-down card (Q7146)", async () => {
    const { s, finish } = await placeDataSquad();

    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
    await finish();
  });

  it("puts a trashed face-down card from under Yoshino face up in the trash (Q7147)", async () => {
    const { s, placedId, finish } = await placeDataSquad();

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await finish();
  });

  it.each([
    { opponentCard: "BT1-009", memoryAfter: 3 },
    { opponentCard: "BT5-021", memoryAfter: 2 },
  ])(
    "still digivolves under a cost-reduction lock, only without the reduction (opponent=$opponentCard) (Q7148)",
    async ({ opponentCard, memoryAfter }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT26-091", as: "yoshino" },
              { card: "BT26-039", as: "sunflowmon" },
            ],
            hand: [{ card: "BT26-044", as: "lilamon" }],
          },
          1: { battleArea: [{ card: opponentCard, as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
      await settle(() => s.perm("sunflowmon").topCard.cardId === "BT26-044");
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("yoshino").isSuspended).toBe(true);
      expect(s.perm("sunflowmon").topCard.instanceId).toBe(s.inst("lilamon").instanceId);
      expect(s.state.memory).toBe(memoryAfter);
    },
  );

  it("triggers once when one effect trashes 2 cards from under Yoshino (Discord 1555741214014447737)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-091",
              as: "yoshino",
              under: [
                { card: "ST24-12", as: "bottom", faceUp: false },
                { card: "BT26-082", as: "next", faceUp: false },
              ],
            },
            "BT26-039",
          ],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("yoshino").permanentId,
      [s.inst("bottom").instanceId, s.inst("next").instanceId],
      0,
    );
    await settle(() => s.state.pendingDecision === undefined);

    const trashTriggers = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" &&
        event.sourcePermanentId === s.perm("yoshino").permanentId &&
        event.effectKey.includes("When effects trash cards from under this Tamer"),
    );
    expect(s.perm("yoshino").stack).toHaveLength(0);
    expect(trashTriggers).toHaveLength(1);
  });

  it("Q3999 waits for a Thomas-reduced digivolution to complete, then orders with its When Digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-072", as: "declaredBase" },
            { card: "BT26-072", as: "otherPeckmon" },
            { card: "BT26-091", as: "yoshino", under: [{ card: "ST24-10", faceUp: false }] },
            "BT25-087",
          ],
          hand: [
            { card: "BT26-076", as: "declaredCrowmon" },
            { card: "BT26-076", as: "secondCrowmon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { battleArea: ["BT1-009", "BT1-010"], security: ["BT1-012"], deck: ["BT1-013", "BT1-014"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        preferTriggerKeys: ["BT26-091"],
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    preferred.push(s.perm("otherPeckmon").permanentId, s.inst("secondCrowmon").instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("declaredBase").permanentId,
        instanceId: s.inst("declaredCrowmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherPeckmon").topCard.instanceId === s.inst("secondCrowmon").instanceId);

    expect(s.perm("declaredBase").topCard.instanceId).toBe(s.inst("declaredCrowmon").instanceId);
    expect(s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req.options?.triggerKeys).toEqual([
      expect.stringMatching(new RegExp(`^${s.inst("declaredCrowmon").instanceId}::BT26-076/`)),
      expect.stringMatching(new RegExp(`^${s.inst("yoshino").instanceId}::subtrigger/`)),
    ]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
