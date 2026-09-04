import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-017.js";
import "../index.js";

describe("EX7-017 SnowAgumon", () => {
  it("has Ice Clad, grants Ice-Snow, and inherits top evolution trash", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("IceClad");
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Ice-Snow"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    });
  });

  it("exposes Ice Clad and Ice-Snow on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-017", as: "snow" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("snow"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("snow"), "Ice-Snow")).toBe(true);
  });

  it("trashes one opposing top evolution card once per turn when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-017"] }] },
        1: {
          security: ["BT1-001", "BT1-001"],
          battleArea: [{ card: "BT1-009", as: "target", under: ["EX7-018", "EX7-018"] }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);

    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
