import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-020.js";

const HOST_CARD = "BT11-042";

describe("BT11-020 Gaomon", () => {
  it("matches the catalog and carries both complete printed effects", () => {
    expect(getCardDefinition("BT11-020")).toMatchObject({
      cardId: "BT11-020",
      nameEn: "Gaomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash" }] },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "Return", to: "hand", condition: { kind: "youHave" } }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 2 for 0", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-002", as: "base" }], hand: [{ card: "BT11-020", as: "gaomon" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-020");
    expect(s.state.memory).toBe(2);
  });
  it("adds both a Gaogamon Digimon and a blue Tamer when both are revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-020", as: "gaomon" }],
          deck: [
            { card: "BT11-025", as: "gaogamon" },
            { card: "BT11-090", as: "tamer" },
            { card: "BT1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rest").instanceId));

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("gaogamon").instanceId);
    expect(handIds).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("rest").instanceId);
  });

  it("adds the one available category when only a blue Tamer is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-020", as: "gaomon" }],
          deck: [
            { card: "BT11-090", as: "tamer" },
            { card: "BT1-001", as: "rest1" },
            { card: "BT1-001", as: "rest2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("returns one opposing level 3 on attack with a Tamer, only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: HOST_CARD, as: "host", under: ["BT11-020"] }, "BT11-090"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not return a level 3 without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-020"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
