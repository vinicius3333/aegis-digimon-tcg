import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { EffectTiming } from "@aegis/shared";
import "../index.js";

async function resolveQ6728WithFirst(firstCardId: "EX12-046" | "EX12-076") {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-076", as: "executor", under: ["EX12-046", "EX12-004"] }],
        hand: [{ card: "EX12-009", as: "playTarget" }],
      },
      1: { security: ["EX12-005", "EX12-005"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
  );
  await s.ready();

  const firing = advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const pending = s.state.pendingDecision!;
  const request = s.decisions.at(-1)!.req;
  const options = request.options as { triggerKeys: string[]; triggerCardIds: string[] };
  expect(options.triggerCardIds).toEqual(expect.arrayContaining(["EX12-046", "EX12-076"]));
  expect(options.triggerCardIds).toHaveLength(2);
  const firstIndex = options.triggerCardIds.indexOf(firstCardId);
  expect(firstIndex).toBeGreaterThanOrEqual(0);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "orderTriggers", order: [options.triggerKeys[firstIndex]!] },
    }),
  ).toEqual({ ok: true });
  await firing;
  return s;
}

describe("EX12-004 Onibimon", () => {
  it("grants Execute to its TB host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-046", as: "executor", under: ["EX12-004"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("executor"), "Execute")).toBe(true);
  });

  it("does not grant Execute to a host without the TB trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-004"] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Execute")).toBe(false);
  });

  it("does not grant Execute during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-046", as: "host", under: ["EX12-004"] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Execute")).toBe(false);
  });

  it("Q6728: may resolve Shishimamon first, play from hand, then delete by Execute", async () => {
    const s = await resolveQ6728WithFirst("EX12-046");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-076")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-076", "EX12-046", "EX12-004"]),
    );
  });

  it("Q6728: resolving Execute first deletes the host and Shishimamon can no longer activate", async () => {
    const s = await resolveQ6728WithFirst("EX12-076");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-076")).toBe(false);
  });

  it("encodes a permanent self-targeted Execute grant gated by the TB trait", () => {
    const effect = registeredCompiledCards.get("EX12-004")!.effects[0]!;
    expect(effect.trigger).toBe("YourTurn");
    expect(effect.isInherited).toBe(true);
    expect(effect.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      keyword: { keyword: "Execute" },
      duration: "permanent",
      condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ match: "trait", tokens: ["TB"] }] } },
    });
  });
});
