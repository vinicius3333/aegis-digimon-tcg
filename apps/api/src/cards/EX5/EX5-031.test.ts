import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-031.js";
import "../index.js";

describe("EX5-031 Chirinmon", () => {
  it("can trash the top security card to unsuspend when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: false,
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
    });
  });
  it("inherits placing a yellow hand card into security when combined security is six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          from: ["hand"],
          toTop: true,
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          optional: true,
          source: { filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1 },
        },
      ],
    });
  });

  it("trashes the top security card and unsuspends on public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-029", as: "base", suspended: true }],
          hand: [{ card: "EX5-031", as: "chirinmon" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-031" && s.state.players[0]!.security.length === 0);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("cannot unsuspend on digivolution when the mandatory security cost is unavailable", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-029", as: "base", suspended: true }],
        hand: [{ card: "EX5-031", as: "chirinmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-031");

    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("places a yellow hand card into security once when inherited and within the six-card limit", async () => {
    const qualifying = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-031"] }],
          hand: [{ card: "BT1-087", as: "yellowTamer" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await qualifying.ready();
    await advance(qualifying.engine).fire(EffectTiming.OnUseAttack, qualifying.perm("host"));
    await settle(() => qualifying.state.players[0]!.security.length === 4);
    expect(qualifying.state.players[0]!.security.length).toBe(4);
    expect(qualifying.state.players[0]!.hand).toHaveLength(0);
    await advance(qualifying.engine).fire(EffectTiming.OnUseAttack, qualifying.perm("host"));
    expect(qualifying.state.players[0]!.security.length).toBe(4);

    const overLimit = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-031"] }],
          hand: [{ card: "BT1-087", as: "yellowTamer" }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await overLimit.ready();
    await advance(overLimit.engine).fire(EffectTiming.OnUseAttack, overLimit.perm("host"));
    await settle();
    expect(overLimit.state.players[0]!.security.length).toBe(4);
    expect(overLimit.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-087");
  });
});
