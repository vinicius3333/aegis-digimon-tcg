import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-079.js";
import "../index.js";

describe("BT15-079", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { sourceRef: "battleOpponent" } }],
    }));
  it("deletes an unsuspended opposing Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { unsuspended: true } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete" }] });
  });
  it("restricts this Digimon to white digivolution targets during its owner's turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: { filter: { isSelfRef: true }, isSelf: true },
          into: { colors: ["White"] },
        },
      ],
    });
  });
  it("deletes itself at opponent end to play a non-Piedmon Dark Masters and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });

  it("naturally deletes exactly one unsuspended opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-079", as: "piedmon" }] },
        1: {
          battleArea: [
            { card: "BT15-072", as: "unsuspendedLevel4" },
            { card: "BT15-076", as: "unsuspendedLevel5" },
            { card: "BT15-079", as: "unsuspendedLevel6" },
            { card: "BT15-072", as: "suspendedLevel4", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1 && s.state.players[1]!.battleArea.length === 3);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("suspendedLevel4").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => ["BT15-072", "BT15-076"].includes(cardId))).toHaveLength(1);
  });

  it("naturally deletes itself at the opponent end and plays a different Dark Master for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-079", as: "piedmon" }],
          hand: [
            { card: "BT15-052", as: "puppetmon" },
            { card: "BT15-079", as: "excludedPiedmon" },
          ],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-052"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("piedmon").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT15-052");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("excludedPiedmon").instanceId,
    );
  });

  it("naturally uses the Piedmon inherited effect from a stack after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-102", as: "host", under: ["BT15-079"], dp: 5000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
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

describe("BT15-079 Piedmon — KB Q&A rulings", () => {
  it("a MetalSeadramon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2514)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-079", "BT15-031", "BT15-052")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-079", "BT15-031", "BT15-052"),
    );
  });

  it("a Puppetmon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2534)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-079", "BT15-052", "BT15-066")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-079", "BT15-052", "BT15-066"),
    );
  });

  it("a Machinedramon played by this card's [End of Opponent's Turn] does not activate its own until the next opponent turn end (Q2552)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-079", "BT15-066", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-079", "BT15-066", "BT15-031"),
    );
  });

  it("played by Machinedramon's [End of Opponent's Turn], its own [End of Opponent's Turn] waits until the next opponent turn end (Q2573)", async () => {
    expect(await playFromEndOfOpponentsTurn("BT15-066", "BT15-079", "BT15-031")).toEqual(
      waitsForNextOpponentTurnEnd("BT15-066", "BT15-079", "BT15-031"),
    );
  });

  it("can digivolve into a multicolor Digimon that includes white, but not into a multicolor one without white (Q2574)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-079", as: "piedmon" },
          { card: "BT3-089", as: "unrestrictedPurpleLevel6" },
        ],
        hand: [
          { card: "EX12-077", as: "whiteRedPurpleProximamon" },
          { card: "BT12-111", as: "purpleBlackDarknessBagramon" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const piedmonId = s.perm("piedmon").permanentId;
    expect(getCardDefinition("EX12-077")!.colors).toEqual(expect.arrayContaining(["White", "Purple"]));
    expect(getCardDefinition("BT12-111")!.colors).toEqual(["Purple", "Black"]);
    expect(s.inst("purpleBlackDarknessBagramon").digivolveTargetPermanentIds).toContain(
      s.perm("unrestrictedPurpleLevel6").permanentId,
    );
    expect(s.inst("purpleBlackDarknessBagramon").digivolveTargetPermanentIds).not.toContain(piedmonId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: piedmonId,
        instanceId: s.inst("purpleBlackDarknessBagramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.inst("whiteRedPurpleProximamon").digivolveTargetPermanentIds).toContain(piedmonId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: piedmonId,
        instanceId: s.inst("whiteRedPurpleProximamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("piedmon").topCard.cardId === "EX12-077");

    expect(s.perm("piedmon").topCard.cardId).toBe("EX12-077");
  });
});
