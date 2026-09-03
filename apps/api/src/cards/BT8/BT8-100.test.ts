import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-100.js";

describe("BT8-100 Disaster Blaster", () => {
  it("keeps one selected target and mutually exclusive DP branches in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "SelectBind",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "target" },
            },
            {
              kind: "ModifyDP",
              amount: -3000,
              duration: "forTheTurn",
              condition: { kind: "not", condition: { kind: "anyOf" } },
              target: { fromSelectionRef: "target" },
            },
            {
              kind: "ModifyDP",
              amount: -6000,
              duration: "forTheTurn",
              condition: { kind: "anyOf" },
              target: { fromSelectionRef: "target" },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("gives -3000 DP without a multicolor Digimon card in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-034"], hand: [{ card: "BT8-100", as: "option" }] },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 3000);
  });

  it("gives -6000 DP while a multicolor Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-015"], hand: [{ card: "BT8-100", as: "option" }] },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("gives -6000 DP when a digivolution card is multicolor", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-084", under: ["BT8-046", "BT8-039"] }, "BT8-034"],
          hand: [{ card: "BT8-100", as: "option" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("counts a multicolor Tamer placed in a digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-034", as: "stacked", under: ["BT11-094"] }],
          hand: [{ card: "BT8-100", as: "option" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("does not count a multicolor card placed under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-090", under: ["BT11-094"] }, "BT8-034"],
          hand: [{ card: "BT8-100", as: "option" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP !== before);

    expect(s.perm("target").currentDP).toBe(before - 3000);
  });

  it("activates the same conditional Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-015"], security: [{ card: "BT8-100", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("does not combine two differently colored monocolor stack cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-060", under: ["BT1-001", "BT17-019", "BT1-032"] }, "BT8-034"],
          hand: [{ card: "BT8-100", as: "option" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== before);

    expect(s.perm("target").currentDP).toBe(before - 3000);
  });
});
