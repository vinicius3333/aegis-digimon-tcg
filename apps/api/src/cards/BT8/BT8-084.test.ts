import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-013.js";
import "./BT8-084.js";
import "../BT10/BT10-011.js";

describe("BT8-084 Kimeramon", () => {
  it("places a level-5-or-lower Digimon from trash under itself and reduces DP per resulting color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base" }],
          hand: [{ card: "BT8-084", as: "evolving" }],
          trash: [{ card: "BT2-024", as: "blueSource" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first" },
            { card: "BT2-047", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-084"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT2-024", "AD1-001"]);
    expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("blueSource").instanceId);
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(3000);
  });

  it("DNA digivolves for 0 from two level-4 Digimon sharing one color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-074", as: "purpleA" },
            { card: "BT10-075", as: "purpleB" },
          ],
          hand: [{ card: "BT8-084", as: "kimeramon" }],
          deck: ["BT8-035", "BT8-036"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleA").permanentId, s.perm("purpleB").permanentId],
        instanceId: s.inst("kimeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-084"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("excludes a face-down stack color from the When Digivolving reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-084",
              as: "kimeramon",
              under: [{ card: "BT1-009", faceUp: false }, "BT2-024"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kimeramon"));

    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("counts only the printed white color for When Digivolving on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-084",
              as: "kimeramon",
              under: [{ card: "BT1-009", faceUp: false }, "BT2-024"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kimeramon"));

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("is treated as all stack colors and gains +4000 DP at four colors during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-084", as: "kimeramon", under: ["BT8-013", "BT8-004", "BT8-005"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("kimeramon").currentDP).toBe(12000);
  });
});

describe("BT8-084 Kimeramon — KB Q&A rulings", () => {
  it("is treated as white plus the colors of its digivolution cards during your turn (Q1763)", async () => {
    const onTurn = (turnSeat: 0 | 1) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT8-084", as: "kimeramon", under: ["BT8-013", "BT1-071"] }] },
      });
      s.state.turnSeat = turnSeat;
      return s;
    };

    const yourTurn = onTurn(0);
    await yourTurn.ready();
    expect([...observe(yourTurn.engine).effectiveColors(yourTurn.perm("kimeramon"))].sort()).toEqual([
      "Green",
      "Red",
      "White",
    ]);
    expect(yourTurn.perm("kimeramon").currentDP).toBe(8000);

    const opponentsTurn = onTurn(1);
    await opponentsTurn.ready();
    expect(observe(opponentsTurn.engine).effectiveColors(opponentsTurn.perm("kimeramon"))).toEqual(["White"]);
  });

  it("does not activate BetelGammamon's [When Digivolving] Blitz gained after its own [When Digivolving] placed Canoweissmon (Q1940)", async () => {
    const digivolveBetelGammamonIntoKimeramon = (canoweissmonAlreadyUnder: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT8-013", as: "betelGammamon", under: canoweissmonAlreadyUnder ? ["BT10-011"] : [] }],
            hand: [{ card: "BT8-084", as: "kimeramon" }],
            trash: canoweissmonAlreadyUnder ? [] : ["BT10-011"],
          },
          1: { security: ["BT8-034"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("betelGammamon").permanentId,
          instanceId: s.inst("kimeramon").instanceId,
        }),
      ).toEqual({ ok: true });
      return s;
    };
    const blitzWasOffered = (s: ReturnType<typeof digivolveBetelGammamonIntoKimeramon>) =>
      s.decisions.some(({ req }) => JSON.stringify(req).includes("activateBlitz"));

    const placedByKimeramon = digivolveBetelGammamonIntoKimeramon(false);
    await settle();
    const kimeramon = placedByKimeramon.perm("betelGammamon");
    expect(kimeramon.topCard?.cardId).toBe("BT8-084");
    expect(kimeramon.stack.map((card) => card.cardId)).toEqual(["BT10-011", "BT8-013"]);
    expect(placedByKimeramon.state.memory).toBe(-1);
    expect(placedByKimeramon.state.turnSeat).toBe(0);
    expect(blitzWasOffered(placedByKimeramon)).toBe(false);
    expect(placedByKimeramon.engine.hasAcceptedBlitzAttack(kimeramon.permanentId)).toBe(false);
    expect(
      placedByKimeramon.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kimeramon.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(placedByKimeramon.state.players[1]!.security).toHaveLength(1);

    const alreadyUnder = digivolveBetelGammamonIntoKimeramon(true);
    await settle();
    expect(blitzWasOffered(alreadyUnder)).toBe(true);
    expect(alreadyUnder.engine.hasAcceptedBlitzAttack(alreadyUnder.perm("betelGammamon").permanentId)).toBe(true);
    expect(
      alreadyUnder.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: alreadyUnder.perm("betelGammamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => alreadyUnder.state.players[1]!.security.length === 0);
    expect(alreadyUnder.state.players[1]!.security).toHaveLength(0);
  });
});
