import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-004 Onibimon", () => {
  it("grants Execute to its TB host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-046", as: "executor", under: ["EX12-004"] }] },
    });
    await s.ready();

    const executorId = s.perm("executor").permanentId;
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(executorId, "Execute")).toBe(true);
  });

  it("does not grant Execute to a host without the TB trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-004"] }] } });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Execute")).toBe(false);
  });

  it("does not grant Execute during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-046", as: "host", under: ["EX12-004"] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Execute")).toBe(false);
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
