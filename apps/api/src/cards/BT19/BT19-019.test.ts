import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-019 Shellmon", () => {
  it("naturally evolves from a level-3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-018", as: "base" }],
          hand: [{ card: "BT19-019", as: "shell" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shell").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-019");
    expect(s.state.memory).toBe(8);
  });

  it("naturally resolves its inherited memory gain after a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-020", as: "host", under: ["BT19-019"] }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it.each([0, 1])("with %i existing Tamer(s), may play Yao Qinglan from hand for free", async (tamerCount) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-019", as: "shell" },
            ...(tamerCount === 1 ? [{ card: "BT19-081", as: "existing" }] : []),
          ],
          hand: [{ card: "BT19-082", as: "yao" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shell"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-082")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("with 2 Tamers, cannot play Yao Qinglan", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-019", as: "shell" }, { card: "BT19-081" }, { card: "BT19-079" }],
          hand: [{ card: "BT19-082", as: "yao" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shell"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-082"]);
  });

  it("may decline the eligible free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-019", as: "shell" }],
          hand: [{ card: "BT19-082", as: "yao" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shell"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-082"]);
  });

  it("is always Aquatic and grants inherited End of Attack memory once per turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-020", as: "host", under: ["BT19-019"] }] } });
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("host"), "Blue Flare")).toBe(true);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);

    const shell = setupEngine({ 0: { battleArea: [{ card: "BT19-019", as: "shell" }] } });
    await shell.ready();
    expect(observe(shell.engine).hasEffectiveTrait(shell.perm("shell"), "Aquatic")).toBe(true);
  });
});
