import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
      // Seat 0 has no legal Main action here, so the turn auto-passes as soon as the
      // start-of-phase effect finishes and the rest of the turn keeps moving cards under the
      // same Tamer. Snapshot what this clause produced as it resolves instead of racing the
      // Main window for a board that later turns keep changing.
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
