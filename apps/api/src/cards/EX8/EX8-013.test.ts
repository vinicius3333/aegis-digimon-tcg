import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-013.js";

describe("EX8-013", () => {
  it("inherits Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "SecurityAttack",
      amount: 1,
      raw: "＜Security Attack +1＞",
    }));
  it("exposes inherited Security Attack +1 on live state", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: [{ card: "EX8-013", as: "skull" }] }] },
      1: { security: ["BT1-045", "BT1-046"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("publishes and uses the off-color level-4 NSo route for exactly 3", async () => {
    expect(digivolutionRequirementsFor("EX8-013")).toContainEqual({
      level: 4,
      traits: ["NSo"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-059", as: "devimon" }],
        hand: [{ card: "EX8-013", as: "skullMeramon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("devimon").permanentId,
        instanceId: s.inst("skullMeramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("devimon").topCard.instanceId === s.inst("skullMeramon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("rejects an off-color level-4 non-NSo base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "gorillamon" }],
        hand: [{ card: "EX8-013", as: "skullMeramon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gorillamon").permanentId,
        instanceId: s.inst("skullMeramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
