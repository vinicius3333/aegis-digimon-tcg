import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-066.js";

describe("BT15-066", () => {
  it("de-digivolves an opposing Digimon by two to level 3 on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
  });
  it("deletes itself to play a non-Machinedramon Dark Masters and inherits Reboot", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("restricts this Machinedramon to white evolution targets for its turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "RestrictDigivolveInto", into: { colors: ["White"] }, duration: "forTheTurn" }],
    });
  });

  it("restricts this Machinedramon to white evolution targets during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-066", as: "machinedramon" }],
        hand: [
          { card: "BT15-102", as: "whiteApocalymon" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.inst("whiteApocalymon").digivolveTargetPermanentIds).toContain(s.perm("machinedramon").permanentId);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(s.perm("machinedramon").permanentId);
  });

  it("unsuspends a legal inherited stack during the opponent's natural unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-102", as: "host", under: ["BT15-066"] }] },
        1: { deck: ["BT15-055"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    s.state.turnSeat = 1;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle();
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

describe("BT15-066 Machinedramon — KB Q&A rulings", () => {
  it("a MetalSeadramon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2514)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-066", "BT15-031", "BT15-052")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-066", "BT15-031", "BT15-052"),
    );
  });

  it("a Puppetmon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2534)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-066", "BT15-052", "BT15-079")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-066", "BT15-052", "BT15-079"),
    );
  });

  it("played by Puppetmon's [End of Opponent's Turn], its own [End of Opponent's Turn] waits until the next opponent turn end (Q2552)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-052", "BT15-066", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-052", "BT15-066", "BT15-031"),
    );
  });

  it("can digivolve into a two-color Digimon that includes white, but not into a two-color one without white (Q2553)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-066", as: "machinedramon" },
          { card: "BT2-064", as: "unrestrictedBlackMega" },
        ],
        hand: [
          { card: "BT17-060", as: "blackWhiteArmageddemon" },
          { card: "BT16-036", as: "yellowBlackChaosmon" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const machinedramonId = s.perm("machinedramon").permanentId;
    expect(getCardDefinition("BT17-060")!.colors).toEqual(["Black", "White"]);
    expect(getCardDefinition("BT16-036")!.colors).toEqual(["Yellow", "Black"]);
    expect(s.inst("yellowBlackChaosmon").digivolveTargetPermanentIds).toContain(
      s.perm("unrestrictedBlackMega").permanentId,
    );
    expect(s.inst("yellowBlackChaosmon").digivolveTargetPermanentIds).not.toContain(machinedramonId);
    expect(s.inst("blackWhiteArmageddemon").digivolveTargetPermanentIds).toContain(machinedramonId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: machinedramonId,
        instanceId: s.inst("blackWhiteArmageddemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machinedramon").topCard.cardId === "BT17-060");

    expect(s.perm("machinedramon").topCard.cardId).toBe("BT17-060");
  });

  it("a Piedmon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2573)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-066", "BT15-079", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-066", "BT15-079", "BT15-031"),
    );
  });
});
