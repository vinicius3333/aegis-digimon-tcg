import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-024.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-024 Shoemon", () => {
  it("reduces Puppet digivolution costs by 1 on your turn", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Puppet"] }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    }));
  it("inherits permanent -3000 DP to opposing Security Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifySecurityDP",
      amount: -3000,
      duration: "permanent",
    }));

  it("applies the inherited -3000 DP modifier to opposing Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["EX7-024"] }] },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("reduces a Puppet digivolution by 1 but does not reduce a non-Puppet", async () => {
    const puppet = setupEngine({
      0: { battleArea: [{ card: "EX7-024", as: "host" }], hand: [{ card: "EX7-025", as: "puppet" }] },
    });
    puppet.state.memory = 2;
    await puppet.ready();
    expect(
      puppet.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: puppet.perm("host").permanentId,
        instanceId: puppet.inst("puppet").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => puppet.perm("host").topCard?.cardId === "EX7-025");
    expect(puppet.state.memory).toBe(1);

    const other = setupEngine({
      0: { battleArea: [{ card: "EX7-024", as: "host" }], hand: [{ card: "BT1-051", as: "other" }] },
    });
    other.state.memory = 2;
    await other.ready();
    expect(
      other.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: other.perm("host").permanentId,
        instanceId: other.inst("other").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => other.perm("host").topCard?.cardId === "BT1-051");
    expect(other.state.memory).toBe(0);
  });
});
