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
      actions: [{ kind: "RestrictDigivolveInto", into: { colors: ["White"] }, duration: "forTheTurn" }],
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
          security: ["BT1-009"],
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

type DarkMasterId = "BT15-031" | "BT15-052" | "BT15-066" | "BT15-079";

function darkMasterZones(s: ReturnType<typeof setupEngine>) {
  const player = s.state.players[0]!;
  return {
    battleArea: player.battleArea.map(({ topCard }) => topCard.cardId),
    darkMastersInHand: player.hand.map(({ cardId }) => cardId).filter((cardId) => cardId.startsWith("BT15-")),
    trash: player.trash.map(({ cardId }) => cardId),
  };
}

async function runOpponentTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 4;
  await advance(s.engine).runTurn(1);
}

async function runOwnTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.turnSeat = 0;
  s.state.memory = 0;
  await advance(s.engine).runTurn(0);
}

// The spare Dark Master in hand is what a wrongly triggered [End of Opponent's Turn] would play.
async function playFromEndOfOpponentsTurn(host: DarkMasterId, played: DarkMasterId, spare: DarkMasterId) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: host, as: "host" }],
        hand: [
          { card: played, as: "played" },
          { card: spare, as: "spare" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
  );
  await s.ready();

  await runOpponentTurn(s);
  const afterPlayedTurn = darkMasterZones(s);

  await runOwnTurn(s);
  await runOpponentTurn(s);

  return { afterPlayedTurn, afterNextOpponentTurn: darkMasterZones(s) };
}

function waitsForNextOpponentTurnEnd(host: DarkMasterId, played: DarkMasterId, spare: DarkMasterId) {
  return {
    afterPlayedTurn: { battleArea: [played], darkMastersInHand: [spare], trash: [host] },
    afterNextOpponentTurn: { battleArea: [spare], darkMastersInHand: [], trash: [host, played] },
  };
}

describe("BT15-052 Puppetmon — KB Q&A rulings", () => {
  it("a MetalSeadramon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2514)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-052", "BT15-031", "BT15-066")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-052", "BT15-031", "BT15-066"),
    );
  });

  it("played by MetalSeadramon's [End of Opponent's Turn], its own [End of Opponent's Turn] waits until the next opponent turn end (Q2534)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-031", "BT15-052", "BT15-079")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-031", "BT15-052", "BT15-079"),
    );
  });

  it("can digivolve into a multicolor Digimon that includes white, but not into a non-white one (Q2535)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-052", as: "puppetmon" }],
        hand: [
          { card: "BT17-077", as: "whiteBlueGreenPaladinMode" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const puppetmonId = s.perm("puppetmon").permanentId;
    expect(getCardDefinition("BT17-077")!.colors).toEqual(expect.arrayContaining(["White", "Green"]));
    expect(getCardDefinition("BT17-077")!.colors.length).toBeGreaterThan(1);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(puppetmonId);
    expect(s.inst("whiteBlueGreenPaladinMode").digivolveTargetPermanentIds).toContain(puppetmonId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: puppetmonId,
        instanceId: s.inst("whiteBlueGreenPaladinMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard.cardId === "BT17-077");

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT17-077");
  });

  it("a Machinedramon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2552)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-052", "BT15-066", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-052", "BT15-066", "BT15-031"),
    );
  });

  it("a Piedmon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2573)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-052", "BT15-079", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-052", "BT15-079", "BT15-031"),
    );
  });
});
