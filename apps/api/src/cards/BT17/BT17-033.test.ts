import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-033.js";

describe("BT17-033", () => {
  it("gains 3000 DP while attacking by suspending a yellow Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "suspend" },
        },
      ],
    });
  });

  it("reduces all opposing security Digimon by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });

  it("weakens a real opposing security Digimon before its security battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-033", under: ["BT17-031"], as: "geo" },
            { card: "AD1-001", dp: 4000, as: "attacker" },
          ],
        },
        1: { security: [{ card: "ST15-08", as: "security" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });
});
