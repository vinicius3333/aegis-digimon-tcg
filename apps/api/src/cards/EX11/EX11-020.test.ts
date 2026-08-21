import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-020.js";

describe("EX11-020 Hanimon", () => {
  it("plays a Shoemon from hand when deleted by an effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-020", as: "hanimon", dp: 1000 }], hand: ["EX11-019"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await (s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }).primitives
      .deletePermanent([s.perm("hanimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-019"), 600);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-019")).toBe(true);
  });

  it("encodes zero-cost Kyaromon evolution and the cost-gated inherited attack ending effect", () => {
    const compiled = runtimeCompiledCard("EX11-020")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Kyaromon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "not", raw: "deleted other than in battle" } }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOpponentAttacks",
        cost: expect.objectContaining({ kind: "deleteOwn", target: expect.objectContaining({ filter: expect.objectContaining({ excludeSelf: true }) }) }),
        actions: [{ kind: "EndAttack" }],
      }],
    }));
  });
});
