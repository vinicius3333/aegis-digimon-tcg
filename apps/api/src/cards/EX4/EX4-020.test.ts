import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-020.js";
import "../index.js";

describe("EX4-020 MetalGreymon", () => {
  it("publishes Material Save 2", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "MaterialSave", amount: 2 },
    ]);
  });

  it("gains Rush and trashes up to two opposing Digimon while DigiXrosing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Rush" } },
      {
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: 2,
        fromTop: false,
        condition: { kind: "digiXrosCount", minimum: 1 },
      },
    ]);
  });
  it("restricts an opposing low-stack Digimon from attacking until opponent turn end", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 3 } },
        },
      ],
    });
  });

  it("grants Rush and trashes two sources from one opposing Digimon while DigiXrosing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-020", as: "host", under: ["BT4-009"] }] },
        1: { battleArea: [{ card: "BT4-009", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("host"), { digiXrosMaterialCount: 1 });
    await settle(() => s.perm("target").stack.length === 1);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("grants Rush without trashing sources when it is not DigiXrosing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-020", as: "host" }] },
        1: { battleArea: [{ card: "BT4-009", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("host"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Rush"));

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("restricts only opposing Digimon with three or fewer sources when GreyKnightsmon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-021", as: "host", under: ["EX4-020"] }] },
        1: {
          battleArea: [
            { card: "BT10-024", as: "eligible", under: ["BT1-009", "BT1-010", "BT1-011"] },
            { card: "BT10-024", as: "ineligible", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(observe(s.engine).isRestricted(s.perm("eligible"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ineligible"), "attack")).toBe(false);
  });

  it("digivolves from a blue level 4 and preserves that source in its stack", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [{ card: "BT10-019", as: "base" }],
        hand: [{ card: "EX4-020", as: "metalGreymon" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-020");

    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT10-019");
  });
});
