import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT13-036.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-036 Liollmon", () => {
  it("gains memory on security removal and preserves the inherited security-count debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "ModifyDP",
          amount: -2000,
          condition: expect.objectContaining({ kind: "totalSecurityCount", value: 6 }),
        }),
      ],
    });
  });

  it("gains memory only for its controller's first security removal during its turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-036", as: "lioll" }], security: ["BT1-001", "BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const before = s.state.memory;
    await advance(s.engine).verb.trashFromSecurity(1, 1);
    expect(s.state.memory).toBe(before);
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.state.memory === before + 1, 3000);
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.memory).toBe(before + 1);
  });

  it("does not gain memory from its controller's security removal during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "lioll" }], security: ["BT1-001"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const before = s.state.memory;

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.state.memory).toBe(before);
  });

  it("the inherited effect sums both security stacks, debuffs an opponent, and is once per turn (Q2288)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-036"] }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("target").currentDP === baseDP - 2000);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(baseDP - 2000);
  });

  it("the inherited effect does not debuff above six combined security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-036"] }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [{ card: "BT13-031", as: "target" }],
          security: ["BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("digivolves from a yellow level 2 for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-006", as: "base" }], hand: [{ card: "BT13-036", as: "lioll" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lioll").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-036");
    expect(s.state.memory).toBe(3);
  });
});
