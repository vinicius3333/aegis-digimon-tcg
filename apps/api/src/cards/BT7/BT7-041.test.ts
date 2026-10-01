import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-041.js";

describe("BT7-041 Kazuchimon", () => {
  it("declares optional Recovery +1 bounded at three security cards", () => {
    const whenDigivolving = runtimeCompiledCard("BT7-041")?.effects.find(
      (effect) => effect.trigger === "WhenDigivolving",
    );

    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "Recover",
      amount: 1,
      untilSecurityCount: 3,
      optional: true,
    });
  });

  it("recovers to 3 security without also gaining memory, then gains Security Attack +1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT7-041", as: "kazuchi" }], security: 2, deck: ["BT1-010"] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kazuchi"));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("kazuchi"), "SecurityAttack")).toBe(1);
  });

  it("gains 2 memory instead of recovering when it digivolves with 3 security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-041", as: "kazuchi" }], security: 3, deck: ["BT1-010"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kazuchi"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("recovers exactly the missing amount when it starts below 2 security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-041", as: "kazuchi" }], security: 1, deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kazuchi"));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT7-041 Kazuchimon — KB Q&A rulings", () => {
  async function digivolveIntoKazuchimon(securityCount: number) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "base" }],
          hand: [{ card: "BT7-041", as: "kazuchimon" }],
          security: securityCount,
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kazuchimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT7-041" &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-041"),
    );
    return { memory: s.state.memory, security: s.state.players[0]!.security.length };
  }

  it("does not gain 2 memory after Recovery brings security up to 3 (Q1571)", async () => {
    const recovered = await digivolveIntoKazuchimon(2);
    expect(recovered).toEqual({ memory: 5, security: 3 });

    const alreadyAtThree = await digivolveIntoKazuchimon(3);
    expect(alreadyAtThree).toEqual({ memory: 7, security: 3 });
  });
});
