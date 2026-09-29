import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-056.js";
import "../index.js";
import "../ST10/ST10-06.js";

describe("BT16-056 [On Play] place top card of an opponent [Vaccine] Digimon onto their security", () => {
  it("uses the same optional placement on play and digivolution and watches opponent security once per turn", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "opponent",
      detachPermanentTop: true,
      optional: true,
    });
    expect(compiled.effects[1]?.actions[0]).toEqual(compiled.effects[0]?.actions[0]);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: { kind: "triggerSecurityIsOpponents" },
          actions: [{ kind: "SecurityManipulation", chooseTopOrBottom: true }],
        },
      ],
    });
  });

  it("moves the opponent Vaccine Digimon's top card to their security stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-056", as: "publimon", faceUp: false }],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "oppDigimon", dp: 4000, under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    const securityBefore = p1.security.length;

    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("publimon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.security.length > securityBefore);

    expect(p1.security.length).toBe(securityBefore + 1);
    expect(p1.security.some((c) => c.instanceId === oppTopId)).toBe(true);
  });

  it("trashes an opponent security card when the placement leaves them at 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-056", as: "publimon" }] },
        1: {
          battleArea: [{ card: "BT1-015", as: "oppDigimon", under: [{ card: "BT1-009" }] }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("publimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p1.trash.length === 1);

    expect(p1.security).toHaveLength(2);
    expect(p1.trash).toHaveLength(1);
  });

  it("cannot place a Vaccine Digimon that has no digivolution cards (BT17-098 Q2892)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-056", as: "publimon" }] },
        1: { battleArea: [{ card: "BT1-015", as: "vaccine" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const vaccineId = s.perm("vaccine").topCard!.instanceId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("publimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(p1.security).toHaveLength(0);
    expect(p1.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([vaccineId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});

describe("BT16-056 Publimon — KB Q&A rulings", () => {
  it("does not trash when Mastemon's effect raises opponent security to 3 and then drops it back to 2 (Q2645)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-056", as: "publimon" }] },
        1: {
          battleArea: [
            { card: "ST10-05", as: "yellowMaterial" },
            { card: "ST10-12", as: "purpleMaterial" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "ST10-07", as: "ghostmon" }],
          security: ["ST10-14", "ST10-14"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const opponent = s.state.players[1]!;
    const ghostmonId = s.inst("ghostmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("purpleMaterial").permanentId],
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.some((permanent) => permanent.topCard.instanceId === ghostmonId));
    await settle();

    expect(opponent.security.map(({ cardId }) => cardId)).toEqual(["ST10-14", "ST10-14"]);
    expect(opponent.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(ghostmonId);
    expect(opponent.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("publimon").permanentId,
    ]);

    // Near miss: a plain digivolve places the same card but plays nothing, so security stays at 3.
    const control = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-056", as: "publimon" }] },
        1: {
          battleArea: [{ card: "ST10-05", as: "base" }],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          trash: [{ card: "ST10-07", as: "ghostmon" }],
          security: ["ST10-14", "ST10-14"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    control.state.turnSeat = 1;
    control.state.memory = 5;
    await control.ready();
    const controlOpponent = control.state.players[1]!;

    expect(
      control.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: control.perm("base").permanentId,
        instanceId: control.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => controlOpponent.trash.length === 1);

    expect(controlOpponent.security).toHaveLength(2);
    expect(controlOpponent.trash).toHaveLength(1);
  });
});
