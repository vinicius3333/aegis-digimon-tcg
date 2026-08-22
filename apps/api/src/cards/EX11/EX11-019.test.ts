import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-019.js";

describe("EX11-019 Shoemon", () => {
  it("plays one Familiar Token when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-019", as: "shoemon", dp: 2000 }] } }, { autoAcceptOptional: true });
    await (s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }).primitives
      .deletePermanent([s.perm("shoemon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId?.includes("Familiar")), 600);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId?.includes("Familiar"))).toBe(true);
  });

  it("encodes the optional Familiar Token and inherited Barrier", () => {
    const compiled = runtimeCompiledCard("EX11-019")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayToken", tokens: ["Familiar"], count: 1, optional: true }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }));
  });
});
