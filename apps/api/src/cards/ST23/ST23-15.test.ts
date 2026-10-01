import { CARD_ID_VIEW_TAG, type CardInstance, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { buildStateView } from "../../engine/state/visibility.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./ST23-12.js";
import "./ST23-13.js";
import "./ST23-15.js";

describe("ST23-15 e-Pulse", () => {
  it("uses the Main effect to play the exact eligible BEATBREAK card and place itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "waiver" }],
          hand: [
            { card: "ST23-15", as: "option" },
            { card: "ST23-13", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const playedId = s.inst("played").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === playedId) &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === playedId && perm.topCard?.cardId === "ST23-13",
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === optionId && perm.topCard?.cardId === "ST23-15",
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
  });

  it("places itself in the battle area even when the optional play is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST23-13", as: "waiver" }], hand: [{ card: "ST23-15", as: "option" }] } },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("keeps the post-cost draw and memory gain mandatory after accepting the start-phase effect", () => {
    const start = runtimeCompiledCard("ST23-15")?.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions).toMatchObject([
      { kind: "Draw", optional: true, abortOnDecline: true, cost: { kind: "place" } },
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(start?.actions[1]).not.toHaveProperty("optional");
  });
});

describe("ST23-15 start of Main", () => {
  it("pays with the battle-area Option, face down at the bottom of a BEATBREAK Tamer, then draws and gains memory", async () => {
    let memoryAfterEffect: number | undefined;
    let handAfterEffect: number | undefined;
    let stackAfterEffect: { instanceId: string; faceUp: boolean }[] | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-15", as: "option" },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "old", faceUp: false }] },
          ],
          deck: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind !== "effectResolved" || event.sourceCardId !== "ST23-15") return;
          memoryAfterEffect = s.state.memory;
          handAfterEffect = s.state.players[0]!.hand.length;
          stackAfterEffect = s.perm("tamer").stack.map((card) => ({
            instanceId: card.instanceId,
            faceUp: card.faceUp,
          }));
        },
      },
    );
    const id = s.inst("option").instanceId;
    const old = s.inst("old").instanceId;
    s.state.memory = 3;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(stackAfterEffect?.map(({ instanceId }) => instanceId)).toContain(id);
    expect(stackAfterEffect?.[0]?.instanceId).toBe(id);
    expect(stackAfterEffect?.find(({ instanceId }) => instanceId === id)?.faceUp).toBe(false);
    expect(stackAfterEffect?.some(({ instanceId }) => instanceId === old)).toBe(true);
    expect(handAfterEffect).toBe(2);
    expect(memoryAfterEffect).toBe(4);
  });
});

async function placeUnderTamerAtStartOfMain() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "ST23-15", as: "placed" },
          { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "older", faceUp: false }] },
        ],
        hand: [{ card: "ST23-12", as: "chiropmon" }],
        trash: [{ card: "ST23-03", as: "returnTarget" }],
        deck: ["BT1-002", "BT1-003", "BT1-004"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-002"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Place 1 card(s) under"] },
  );
  const placedId = s.inst("placed").instanceId;
  s.state.memory = 10;
  s.state.isFirstPlayersFirstTurn = false;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === placedId)).toBe(false);
  return { s, turn, placedId, olderId: s.inst("older").instanceId };
}

function seatsThatCanReadCard(s: EngineSetup, card: CardInstance): Seat[] {
  // eslint-disable-next-line no-new -- constructing the Encoder wires the schema root so per-seat views can be built.
  new Encoder(s.state);
  return ([0, 1] as const).filter((seat) => buildStateView(s.state, seat).hasTag(card, CARD_ID_VIEW_TAG));
}

async function trashBottomCardWithChiropmon(s: EngineSetup, placedId: string): Promise<string[]> {
  const decisionsBefore = s.decisions.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chiropmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === placedId));
  return s.decisions.slice(decisionsBefore).flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
}

describe("ST23-15 e-Pulse — KB Q&A rulings", () => {
  it("places itself below the face-down cards already under the BEATBREAK Tamer (Q6194)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, olderId]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("keeps the face-down stacking order, so the bottom-card cost takes it first (Q6195)", async () => {
    const { s, turn, placedId, olderId } = await placeUnderTamerAtStartOfMain();

    const offeredIds = await trashBottomCardWithChiropmon(s, placedId);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([olderId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === olderId)).toBe(false);
    expect(offeredIds).not.toContain(olderId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("lets only its owner look at itself once placed face down under a Tamer (Q6196)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();
    const placed = s.perm("tamer").stack.find((card) => card.instanceId === placedId)!;

    expect(seatsThatCanReadCard(s, placed)).toEqual([0]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("goes face up to the trash when trashed from under the Tamer (Q6197)", async () => {
    const { s, turn, placedId } = await placeUnderTamerAtStartOfMain();

    await trashBottomCardWithChiropmon(s, placedId);

    const trashed = s.state.players[0]!.trash.find((card) => card.instanceId === placedId)!;
    expect(trashed.faceUp).toBe(true);
    expect(seatsThatCanReadCard(s, trashed)).toEqual([0, 1]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
