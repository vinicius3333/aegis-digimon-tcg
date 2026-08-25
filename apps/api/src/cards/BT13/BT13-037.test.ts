import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT13-037.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-037 Liamon", () => {
  it("trashes the top security card for the attack debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } },
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
  });

  it("trashes its controller's exact top security card and gives an opponent -4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-037", as: "liamon" }],
          security: [{ card: "BT1-001", as: "top-security" }],
        },
        1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.perm("target").currentDP === baseDP - 4000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("top-security").instanceId)).toBe(
      true,
    );
  });

  it("declining the attack effect preserves security and the target's DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-037", as: "liamon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    const baseDP = s.perm("target").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("does not offer the attack effect when its security cost cannot be paid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-037", as: "liamon" }] },
      1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
    });
    const baseDP = s.perm("target").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("the inherited effect sums both security stacks and is once per turn at six (Q2289)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-037"] }],
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
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-037"] }],
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

  it("digivolves from a yellow level 3 for exactly 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "base" }], hand: [{ card: "BT13-037", as: "liamon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("liamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-037");
    expect(s.state.memory).toBe(1);
  });
});
