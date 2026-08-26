import { describe, expect, it } from "vitest";
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
