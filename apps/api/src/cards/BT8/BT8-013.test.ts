import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-013.js";
import "./BT8-084.js";
import "../BT10/BT10-011.js";

describe("BT8-013 BetelGammamon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT8-013", as: "evolving" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("uses Blitz to attack after the digivolution cost passes memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-008", as: "base" }],
        hand: [{ card: "BT8-013", as: "evolving" }],
      },
      1: { security: ["BT8-034"] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.memory).toBe(-1);
    const blitzDecision = s.state.pendingDecision!;
    expect(JSON.parse(blitzDecision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blitzDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("BT8-013 BetelGammamon — KB Q&A rulings", () => {
  function digivolveIntoKimeramon(canoweissmonAlreadyUnder: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-013",
              as: "betelGammamon",
              under: canoweissmonAlreadyUnder ? ["BT10-011"] : [],
            },
          ],
          hand: [{ card: "BT8-084", as: "kimeramon" }],
          trash: canoweissmonAlreadyUnder ? [] : [{ card: "BT10-011", as: "canoweissmon" }],
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
  }

  const blitzWasOffered = (s: ReturnType<typeof digivolveIntoKimeramon>) =>
    s.decisions.some(({ req }) => JSON.stringify(req).includes("activateBlitz"));

  it("does not activate Blitz gained through a Canoweissmon placed under Kimeramon by its [When Digivolving] effect (Q1940)", async () => {
    const placedDuringDigivolve = digivolveIntoKimeramon(false);
    await settle();

    const kimeramon = placedDuringDigivolve.perm("betelGammamon");
    expect(kimeramon.stack.map((card) => card.cardId)).toEqual(["BT10-011", "BT8-013"]);
    expect(placedDuringDigivolve.state.memory).toBe(-1);
    expect(placedDuringDigivolve.state.turnSeat).toBe(0);
    expect(blitzWasOffered(placedDuringDigivolve)).toBe(false);
    expect(placedDuringDigivolve.engine.hasAcceptedBlitzAttack(kimeramon.permanentId)).toBe(false);
    expect(
      placedDuringDigivolve.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kimeramon.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(placedDuringDigivolve.state.players[1]!.security).toHaveLength(1);

    const alreadyInStack = digivolveIntoKimeramon(true);
    await settle();

    expect(blitzWasOffered(alreadyInStack)).toBe(true);
    expect(alreadyInStack.engine.hasAcceptedBlitzAttack(alreadyInStack.perm("betelGammamon").permanentId)).toBe(true);
  });
});
