import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-009 Canoweissmon", () => {
  it("digivolves from hand onto a Gammamon carrying a Gammamon-named card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-008", as: "host", under: [{ card: "RB1-005" }] }],
          hand: [{ card: "RB1-009", as: "canoweissmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");

    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.filter((card) => card.cardId === "RB1-005")).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["RB1-005", "RB1-008"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("uses the special cost-3 path from Lv.3 Gammamon when its stack has Gammamon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-008" }] }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");
    expect(s.state.memory).toBe(0);
  });

  it("can use the printed Lv.4 Gammamon-name evolution without the special stack condition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-021", as: "host" }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    const oldTopId = s.perm("host").topCard.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");
    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("copies effects from a Gammamon-named source but not inherited effects", async () => {
    const sourceEffect = setupEngine({
      0: { battleArea: [{ card: "RB1-009", as: "host", under: [{ card: "RB1-008" }] }] },
    });
    await sourceEffect.ready();
    expect(observe(sourceEffect.engine).hasKeyword(sourceEffect.perm("host"), "Raid")).toBe(true);

    const inheritedOnly = setupEngine({
      0: { battleArea: [{ card: "RB1-009", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await inheritedOnly.ready();
    expect(inheritedOnly.perm("host").currentDP).toBe(10000);
  });
});
