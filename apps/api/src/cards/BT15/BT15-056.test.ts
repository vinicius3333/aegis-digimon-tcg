import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-056.js";

describe("BT15-056", () => {
  it("matches the catalog identity and black/green level-3 evolution routes", () => {
    expect(getCardDefinition("BT15-056")).toMatchObject({
      nameEn: "Ryudamon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      types: ["Beast", "X Antibody", "DigiPolice"],
    });
  });

  it("may place Shuu Yulin under itself to become immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", cost: { kind: "place" }, optional: true },
      ],
    }));
  it("once per turn suspends an opposing Digimon or Tamer with play cost no greater than this Digimon", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", target: { filter: { playCostLteTriggerSource: true } } }],
        },
      ],
    }));

  it("naturally places Shuu Yulin at the start of its main phase and gains opponent-Digimon immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "ryudamon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("ryudamon").stack.some(({ cardId }) => cardId === "BT15-087"));

    expect(s.perm("ryudamon").stack.map(({ cardId }) => cardId)).toContain("BT15-087");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ryudamon"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally triggers once when the host becomes suspended and respects its play-cost ceiling", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-058", as: "host", under: ["BT15-056"] }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT15-052", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );

    preferInstanceIds.push(s.perm("low").topCard!.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("low").isSuspended);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
  });
});
