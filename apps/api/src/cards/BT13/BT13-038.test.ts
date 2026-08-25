import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT13-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-038 Reppamon", () => {
  it("trashes the top security card for Security Attack -2", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -2 },
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

  it("trashes the exact top security card and gives an opposing Digimon Security Attack -2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-038", as: "reppa" }], security: [{ card: "BT1-001", as: "top" }] },
        1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppa").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("declining preserves security and grants no keyword", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-038", as: "reppa" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppa").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("does not offer the main effect when the security cost cannot be paid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-038", as: "reppa" }] },
      1: { battleArea: [{ card: "BT13-031", as: "target" }], security: ["BT1-002"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppa").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("the inherited effect sums both security stacks and is once per turn at six (Q2290)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-038"] }],
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
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-038"] }],
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
      0: { battleArea: [{ card: "BT13-036", as: "base" }], hand: [{ card: "BT13-038", as: "reppa" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("reppa").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-038");
    expect(s.state.memory).toBe(1);
  });
});
