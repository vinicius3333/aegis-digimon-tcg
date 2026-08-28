import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-033.js";

describe("BT6-033 Pulsemon", () => {
  it("may trash security down to three and gains one memory per card trashed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-033", as: "source" }],
          security: ["BT6-034", "BT6-035", "BT6-036", "BT6-037", "BT6-038"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 2 },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.length === 3 && s.state.memory === 2);
    expect(player.trash).toHaveLength(2);
  });

  it("Q1424 may trash only one card from five security and gains exactly one memory", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT6-033", as: "source" }],
        security: ["BT6-034", "BT6-035", "BT6-036", "BT6-037", "BT6-038"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({
      choices: ["Trash 0 security cards", "Trash 1 security card", "Trash 2 security cards"],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4 && s.state.memory === 1);

    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("grants inherited Jamming only while its owner has exactly three security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-034", as: "host", under: ["BT6-033"] }],
        security: ["BT6-035", "BT6-036", "BT6-037", "BT6-038"],
      },
    });

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);

    s.state.players[0]!.security.pop();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
