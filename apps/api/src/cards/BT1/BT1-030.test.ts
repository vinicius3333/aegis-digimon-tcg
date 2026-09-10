import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-030.js";
import "./BT1-026.js";
import "../ST2/ST2-07.js";

describe("BT1-030 Gomamon", () => {
  it("matches the catalog and exact inherited On Deletion IR", () => {
    expect(getCardDefinition("BT1-030")).toMatchObject({
      cardId: "BT1-030",
      nameEn: "Gomamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 3000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Sea Beast"],
      inheritedEffectText: "[On Deletion] Gain 1 memory.",
    });
    expect(getCardDefinition("BT1-030")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-030")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "GainMemory", amount: 1 }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("digivolves from a blue level 2 in breeding for 0 memory and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT1-030", as: "gomamon" }],
        deck: [{ card: "BT1-026", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gomamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a red level 2", () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "base" }, hand: [{ card: "BT1-030", as: "gomamon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gains 1 memory when its Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 1000, suspended: true, under: ["BT1-030"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === -1);
    expect(s.state.memory).toBe(-1);
  });

  it("still completes Piercing before the memory-crossed turn ends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST2-07", as: "blocker", dp: 1000, under: ["BT1-030"] }],
        security: ["BT1-081"],
      },
      1: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[0]!.security.length === 0);

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
