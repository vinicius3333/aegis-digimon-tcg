import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-031.js";
import "./BT15-052.js";
import "./BT15-066.js";
import "./BT15-079.js";

describe("BT15-031", () => {
  it("retains inherited Blocker", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
    }));
  it("returns an opposing level 5 or lower Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Return", to: "hand", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Return", to: "hand" }],
    });
  });
  it("deletes itself at the opponent's end step to play a non-MetalSeadramon Dark Masters", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    }));

  it("returns exactly one opposing level-5-or-lower Digimon on play while level 6 remains", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: {
          battleArea: [
            { card: "BT15-029", as: "levelFive" },
            { card: "BT15-031", as: "levelSix" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metalSeadramon"));
    await settle(() =>
      s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("levelFive").instanceId),
    );

    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("levelFive").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("levelSix").permanentId,
    );
  });

  it("returns a level-5 target when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: { battleArea: [{ card: "BT15-029", as: "target" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("target").instanceId));

    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
  });

  it("during its owner's turn permits only white Digimon as digivolution targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
        hand: [
          { card: "BT1-084", as: "whiteOmnimon" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.inst("whiteOmnimon").digivolveTargetPermanentIds).toContain(s.perm("metalSeadramon").permanentId);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(s.perm("metalSeadramon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalSeadramon").permanentId,
        instanceId: s.inst("blueBurstMode").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("at opponent turn end deletes itself before optionally playing a different Dark Master for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
          hand: [
            { card: "BT15-052", as: "puppetmon" },
            { card: "BT15-031", as: "excludedMetalSeadramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("metalSeadramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-052"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalSeadramon").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-052");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("excludedMetalSeadramon").instanceId,
    );
  });

  it("resolves the opponent end step through public turn progression", async () => {
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
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 4;

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalSeadramon").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-052");
  });

  it("grants inherited Blocker to its host and redirects a player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-025", as: "attacker" }], security: ["BT1-010"] },
      1: {
        battleArea: [{ card: "BT15-025", as: "host", under: ["BT15-031"] }],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

const darkMasterNames = {
  "BT15-052": "Puppetmon",
  "BT15-066": "Machinedramon",
  "BT15-079": "Piedmon",
} as const;
type OtherDarkMaster = keyof typeof darkMasterNames;

function battleCardIds(s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map(({ topCard }) => topCard.cardId);
}

async function runOpponentEndOfTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 4;
  await advance(s.engine).runTurn(1);
}

function ownZones(s: ReturnType<typeof setupEngine>) {
  const player = s.state.players[0]!;
  return {
    battleArea: battleCardIds(s, 0),
    darkMastersInHand: player.hand
      .map(({ cardId }) => cardId)
      .filter((cardId) => cardId in darkMasterNames || cardId === "BT15-031"),
    trash: player.trash.map(({ cardId }) => cardId),
  };
}

async function playDarkMasterThenReachNextOpponentTurnEnd(played: OtherDarkMaster) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
        hand: [
          { card: played, as: "played" },
          { card: "BT15-031", as: "spareMetalSeadramon" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
  );
  await s.ready();

  await runOpponentEndOfTurn(s);
  const afterPlayedTurn = ownZones(s);

  s.state.turnSeat = 0;
  s.state.memory = 0;
  await advance(s.engine).runTurn(0);
  await runOpponentEndOfTurn(s);

  return { afterPlayedTurn, afterNextOpponentTurn: ownZones(s) };
}

function expectedWaitForNextOpponentTurnEnd(played: OtherDarkMaster) {
  return {
    // A wrong trigger here would delete the played Dark Master and play the spare MetalSeadramon.
    afterPlayedTurn: { battleArea: [played], darkMastersInHand: ["BT15-031"], trash: ["BT15-031"] },
    afterNextOpponentTurn: { battleArea: ["BT15-031"], darkMastersInHand: [], trash: ["BT15-031", played] },
  };
}

describe("BT15-031 MetalSeadramon — KB Q&A rulings", () => {
  it("does not activate its [End of Opponent's Turn] when another Dark Master's end-of-turn effect plays it, only at the next opponent turn end (Q2514)", async () => {
    for (const host of Object.keys(darkMasterNames) as OtherDarkMaster[]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: host, as: "host" }],
            hand: [
              { card: "BT15-031", as: "metalSeadramon" },
              { card: "BT15-066", as: "machinedramon" },
            ].filter(({ card }) => card !== host),
            deck: ["BT1-009", "BT1-010"],
          },
          1: { deck: ["BT1-009", "BT1-010", "BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      await s.ready();

      await runOpponentEndOfTurn(s);

      expect(battleCardIds(s, 0), `${darkMasterNames[host]} plays MetalSeadramon`).toEqual(["BT15-031"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(host);

      s.state.turnSeat = 0;
      s.state.memory = 0;
      await advance(s.engine).runTurn(0);
      await runOpponentEndOfTurn(s);

      expect(battleCardIds(s, 0), "next opponent turn end").not.toContain("BT15-031");
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT15-031");
    }
  });

  it("a Puppetmon played by this card's end-of-turn effect does not activate its own [End of Opponent's Turn] until the next opponent turn end (Q2534)", async () => {
    expect(await playDarkMasterThenReachNextOpponentTurnEnd("BT15-052")).toEqual(
      expectedWaitForNextOpponentTurnEnd("BT15-052"),
    );
  });

  it("a Machinedramon played by this card's end-of-turn effect does not activate its own [End of Opponent's Turn] until the next opponent turn end (Q2552)", async () => {
    expect(await playDarkMasterThenReachNextOpponentTurnEnd("BT15-066")).toEqual(
      expectedWaitForNextOpponentTurnEnd("BT15-066"),
    );
  });

  it("a Piedmon played by this card's end-of-turn effect does not activate its own [End of Opponent's Turn] until the next opponent turn end (Q2573)", async () => {
    expect(await playDarkMasterThenReachNextOpponentTurnEnd("BT15-079")).toEqual(
      expectedWaitForNextOpponentTurnEnd("BT15-079"),
    );
  });
});
