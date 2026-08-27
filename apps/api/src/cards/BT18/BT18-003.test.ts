import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-003.js";

describe("BT18-003 Wanyamon", () => {
  it("reduces an opposing Digimon by 2000 when its host attacks with a yellow Tamer", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Yellow"] } },
        },
      ],
    });

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-030", as: "host", under: ["BT18-003"] },
            { card: "BT1-087", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "target" },
            { card: "BT1-030", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("target").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 2000);
    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
    expect(s.perm("secondTarget").currentDP).toBe(baseDP);

    await advance(s.engine).fireForInstance(EffectTiming.OnUseAttack, s.perm("host").topCard!);
    await settle();
    expect(s.perm("secondTarget").currentDP).toBe(baseDP);
  });

  it("does not reduce DP without a yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-003"] }] },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("target").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(baseDP);
  });
});
