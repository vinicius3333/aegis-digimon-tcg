import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT18-022.js";
import "./BT18-023.js";
import "./BT18-024.js";
import "./BT18-089.js";
import "../BT13/BT13-007.js";
import "../BT5/BT5-091.js";

describe("BT18-024 Calmaramon", () => {
  it("uses the inherited once-per-turn attack effect to return an exact level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "calmaramon", under: ["BT18-024"] }] },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("calmaramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === targetId)).toBe(false);
  });

  it("instead places a blue level 3 from hand under itself when its stack lacks one", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT1-030", as: "blueLevel3" },
            { card: "BT1-009", as: "redLevel3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    s.state.memory = 10;
    const sourceId = s.inst("blueLevel3").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calmaramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("calmaramon").stack.some(({ instanceId }) => instanceId === sourceId));

    expect(s.perm("calmaramon").stack.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(4);
  });

  it("naturally places a blue level 3 from hand after evolving from Lanamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-023", as: "lanamon" }],
          hand: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT1-030", as: "blueLevel3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const sourceId = s.inst("blueLevel3").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").stack.some(({ instanceId }) => instanceId === sourceId));

    expect(s.perm("lanamon").topCard.cardId).toBe("BT18-024");
    expect(s.perm("lanamon").stack.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === sourceId)).toBe(false);
  });

  it("naturally returns an opposing level 4 when evolving onto a stack with a level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-023", as: "lanamon", under: ["BT1-030"] }],
          hand: [{ card: "BT18-024", as: "calmaramon" }],
        },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId));

    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === targetId)).toBe(false);
  });

  it("digivolves from Lanamon for the named cost of 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-023", as: "lanamon" }],
        hand: [{ card: "BT18-024", as: "calmaramon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").topCard.cardId === "BT18-024");

    expect(s.state.memory).toBe(2);
    expect(s.perm("lanamon").stack.at(-1)?.cardId).toBe("BT18-023");
  });
});

function digivolve(s: EngineSetup, baseAlias: string, cardAlias: string, alternateRequirementIndex?: number) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(cardAlias).instanceId,
    ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex }),
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

describe("BT18-024 Calmaramon — KB Q&A rulings", () => {
  it("digivolves a Tamer as-is: Digimon digivolve watchers stay silent and a Digimon can't-digivolve lock does not stop it (Q2940)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-089", as: "tommy" },
            { card: "BT5-091", as: "takumi" },
          ],
          hand: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT18-022", as: "kumamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    watched.state.memory = 10;
    await watched.ready();

    expect(digivolve(watched, "tommy", "kumamon")).toEqual({ ok: true });
    await settle(() => watched.perm("tommy").topCard.cardId === "BT18-022");
    await settle();
    expect(watched.perm("takumi").isSuspended).toBe(false);

    expect(digivolve(watched, "lanamon", "calmaramon", 0)).toEqual({ ok: true });
    await settle(() => watched.perm("lanamon").topCard.cardId === "BT18-024");
    await settle(() => watched.perm("takumi").isSuspended);
    expect(watched.perm("takumi").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007" },
          battleArea: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-089", as: "tommy" },
          ],
          hand: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT18-022", as: "kumamon" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    locked.state.memory = 10;
    await locked.ready();

    expect(digivolve(locked, "lanamon", "calmaramon", 0)).toMatchObject({ ok: false });
    expect(locked.perm("lanamon").topCard.cardId).toBe("BT18-023");

    expect(digivolve(locked, "tommy", "kumamon")).toEqual({ ok: true });
    await settle(() => locked.perm("tommy").topCard.cardId === "BT18-022");

    expect(locked.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(["BT18-089"]);
  });

  it("performs the digivolution bonus draw for a Tamer digivolution and for Calmaramon's [Lanamon] route (Q2941)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-089", as: "tommy" },
          ],
          hand: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT18-022", as: "kumamon" },
          ],
          deck: [{ card: "BT1-009", as: "firstDraw" }, { card: "BT1-009", as: "secondDraw" }, "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hand = () => s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(digivolve(s, "tommy", "kumamon")).toEqual({ ok: true });
    await settle(() => hand().includes(s.inst("firstDraw").instanceId));
    expect(s.perm("tommy").topCard.cardId).toBe("BT18-022");
    expect(s.state.players[0]!.deck).toHaveLength(2);

    expect(digivolve(s, "lanamon", "calmaramon", 0)).toEqual({ ok: true });
    await settle(() => hand().includes(s.inst("secondDraw").instanceId));
    expect(s.perm("lanamon").topCard.cardId).toBe("BT18-024");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a card placed on the field that turn (Q2942)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-089", as: "freshTommy", enteredThisTurn: true },
            { card: "BT18-089", as: "establishedTommy" },
            { card: "BT18-023", as: "freshLanamon", enteredThisTurn: true },
            { card: "BT18-023", as: "establishedLanamon" },
          ],
          hand: [
            { card: "BT18-022", as: "freshKumamon" },
            { card: "BT18-022", as: "establishedKumamon" },
            { card: "BT18-024", as: "freshCalmaramon" },
            { card: "BT18-024", as: "establishedCalmaramon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: 2 },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(digivolve(s, "freshTommy", "freshKumamon")).toEqual({ ok: true });
    await settle(() => s.perm("freshTommy").topCard.cardId === "BT18-022");
    expect(digivolve(s, "establishedTommy", "establishedKumamon")).toEqual({ ok: true });
    await settle(() => s.perm("establishedTommy").topCard.cardId === "BT18-022");
    expect(digivolve(s, "freshLanamon", "freshCalmaramon", 0)).toEqual({ ok: true });
    await settle(() => s.perm("freshLanamon").topCard.cardId === "BT18-024");
    expect(digivolve(s, "establishedLanamon", "establishedCalmaramon", 0)).toEqual({ ok: true });
    await settle(() => s.perm("establishedLanamon").topCard.cardId === "BT18-024");

    expect(attackPlayer(s, "freshTommy")).toMatchObject({ ok: false });
    expect(attackPlayer(s, "freshLanamon")).toMatchObject({ ok: false });
    expect(s.perm("freshTommy").isSuspended).toBe(false);
    expect(s.perm("freshLanamon").isSuspended).toBe(false);

    expect(attackPlayer(s, "establishedTommy")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("establishedTommy").isSuspended).toBe(true);
    await settle();
    expect(attackPlayer(s, "establishedLanamon")).toEqual({ ok: true });
  });

  it("treats a Tamer under it as a digivolution card that is trashed when it leaves the field (Q6596)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-042", as: "attacker" }] },
        1: {
          battleArea: [
            {
              card: "BT18-024",
              as: "calmaramon",
              suspended: true,
              under: [{ card: "BT18-089", as: "tamerSource" }, "BT18-023"],
            },
          ],
          security: 1,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.inst("tamerSource").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("calmaramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(
      ["BT18-023", "BT18-024", "BT18-089"].sort(),
    );
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === tamerId)).toBe(true);
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6597)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-024", as: "calmaramon", under: [{ card: "BT18-089", as: "tamerSource" }] }],
        security: [{ card: "BT18-089", as: "securityTamer" }],
      },
    });
    await s.ready();
    const tamerId = s.inst("tamerSource").instanceId;

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("calmaramon"));
    await settle();

    expect(s.perm("calmaramon").stack.map(({ instanceId }) => instanceId)).toEqual([tamerId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("securityTamer").instanceId),
    ).toBe(true);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6598)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-024", as: "calmaramon", under: ["BT18-089"] }] },
        1: {
          battleArea: [{ card: "BT1-030", as: "target", under: [{ card: "BT1-001", as: "bottomSource" }, "BT1-009"] }],
          security: 2,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const bottomId = s.inst("bottomSource").instanceId;

    expect(attackPlayer(s, "calmaramon")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === bottomId));

    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });
});
