import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-12 DoGatchmon", () => {
  it("links a Social/Navi/Tool Digimon from hand when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-12", as: "dogatchmon" }], hand: [{ card: "BT21-047", as: "navimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dogatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("navimon").instanceId));
    expect(s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("navimon").instanceId)).toBe(true);
  });
});
