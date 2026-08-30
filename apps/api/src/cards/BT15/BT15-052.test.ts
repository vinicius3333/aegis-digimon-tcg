import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-052.js";

describe("BT15-052", () => {
  it("matches the catalog identity and green level-6 evolution route", () => {
    expect(getCardDefinition("BT15-052")).toMatchObject({
      nameEn: "Puppetmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      types: ["Puppet", "Dark Masters"],
    });
  });

  it("retains inherited Piercing", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("returns a suspended opposing Digimon to deck bottom on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Return", to: "deckBottom", target: { filter: { suspended: true } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Return", to: "deckBottom" }],
    });
  });
  it("restricts its own digivolution to white Digimon", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "RestrictDigivolveInto", into: { colors: ["White"] } }],
    }));
  it("deletes itself at opponent end to play a non-Puppetmon Dark Masters", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    }));

  it("naturally plays and bottoms one suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-052", as: "puppetmon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("BT15-052");
  });

  it("naturally returns a suspended opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-052", as: "puppetmon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("during its owner's turn permits only white Digimon as digivolution targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-052", as: "puppetmon" }],
        hand: [
          { card: "BT15-102", as: "whiteApocalymon" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
      },
    });

    s.state.memory = 10;
    await s.ready();
    expect(s.inst("whiteApocalymon").digivolveTargetPermanentIds).toContain(s.perm("puppetmon").permanentId);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(s.perm("puppetmon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puppetmon").permanentId,
        instanceId: s.inst("blueBurstMode").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("naturally plays Puppetmon from a Dark Masters end-step effect without retriggering its passed timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
          hand: [{ card: "BT15-052", as: "puppetmon" }],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-052"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard!.cardId)).toContain("BT15-052");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalSeadramon").instanceId,
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
