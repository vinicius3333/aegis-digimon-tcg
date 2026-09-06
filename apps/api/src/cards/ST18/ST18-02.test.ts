import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-02 Biyomon", () => {
  it("plays itself for free from a deleted stack when it has digivolution cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST18-02", as: "biyomon", under: ["ST18-01"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const biyomonInstanceId = s.perm("biyomon").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("biyomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === biyomonInstanceId));

    const restored = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === biyomonInstanceId);
    expect(restored).toBeDefined();
    expect(restored?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.trash[0]!.cardId).toBe("ST18-01");
  });

  it("does not replay when deleted without digivolution cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST18-02", as: "biyomon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.perm("biyomon").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("biyomon").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
