import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-035.js";

describe("BT15-035", () => {
  it("may trash Numemon/Sukamon from hand to give an opposing Digimon Security Attack -1", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
      cost: { kind: "trash" },
      optional: true,
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainKeyword", keyword: { amount: -1 } }],
    });
  });
  it("also grants the same inherited attack reduction and the Numemon rule name", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Numemon"] }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
    });
  });

  it("On Play trashes a Numemon-name card before giving exactly one opponent Security Attack -1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-035", as: "geremon" }],
          hand: [
            { card: "BT14-058", as: "numemonCost" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-029", as: "target" },
            { card: "BT15-029", as: "peer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geremon"));
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("numemonCost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonmatch").instanceId]);
    expect(s.perm("target").securityAttack).toBe(0);
    expect(s.perm("peer").securityAttack).toBe(1);
  });

  it("does not apply the reduction when the named hand cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-035", as: "geremon" }], hand: ["BT1-009"] },
        1: { battleArea: [{ card: "BT15-029", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geremon"));

    expect(s.perm("target").securityAttack).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("On Deletion pays from the leaving owner's hand and applies the reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-035", as: "geremon" }],
          hand: [{ card: "BT14-034", as: "sukamonCost" }],
        },
        1: { battleArea: [{ card: "BT15-029", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("geremon").permanentId])).toBe(1);
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sukamonCost").instanceId);
    expect(s.perm("target").securityAttack).toBe(0);
  });

  it("publishes the Numemon rule name and inherited attack reduction behaviorally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-035", as: "geremon" },
            { card: "BT15-029", as: "host", under: ["BT15-035"] },
          ],
        },
        1: {
          battleArea: [{ card: "BT15-029", as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("geremon"))).toContain("numemon");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.perm("target").securityAttack).toBe(0);
  });
});

describe("BT15-035 Geremon — KB Q&A rulings", () => {
  it("can be placed from the trash under ST19-13 ShinMonzaemon as a card with [Numemon] in its name (Q861)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shin" }],
          trash: [
            { card: "BT1-010", as: "nearMiss" },
            { card: "BT15-035", as: "geremon" },
          ],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("nearMiss").instanceId);
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shin").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    const shin = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "ST19-13");
    expect(shin?.stack[0]?.instanceId).toBe(s.inst("geremon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("loses its (Rule) name [Numemon] when BT11-043 KingSukamon changes its original name to [Sukamon] (Q2081)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "BT15-035", as: "geremon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const view = observe(s.engine);
    expect(view.effectiveNames(s.perm("geremon"))).toEqual(expect.arrayContaining(["geremon", "numemon"]));
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("geremon").originalNameOverride === "Sukamon");

    expect(view.effectiveNames(s.perm("geremon"))).toEqual(["sukamon"]);
  });

  it("loses its (Rule) name [Numemon] when BT14-097 Suka's Curse changes its original name to [Sukamon] (Q2479)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-035", as: "target" },
            { card: "BT15-035", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    await s.ready();
    const view = observe(s.engine);
    expect(view.effectiveNames(s.perm("target"))).toEqual(expect.arrayContaining(["geremon", "numemon"]));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").originalNameOverride === "Sukamon");

    expect(view.effectiveNames(s.perm("target"))).toEqual(["sukamon"]);
    expect(view.effectiveNames(s.perm("attacker"))).toEqual(expect.arrayContaining(["geremon", "numemon"]));
  });

  it("is treated as having the [Numemon] name in the hand and the breeding area (Q2516)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-035", as: "geremon" },
            { card: "BT1-015", as: "greymon" },
          ],
          breeding: { card: "BT15-035", as: "breedingGeremon" },
          hand: [
            { card: "BT1-015", as: "nearMiss" },
            { card: "BT15-035", as: "handGeremon" },
            { card: "BT22-038", as: "monzaemon" },
          ],
        },
        1: { battleArea: [{ card: "BT15-029", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("nearMiss").instanceId);
    await s.ready();

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingGeremon").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingGeremon").topCard.cardId === "BT22-038");
    expect(s.state.memory).toBe(2);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geremon"));
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("handGeremon").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.perm("target").securityAttack).toBe(0);

    const control = setupEngine({
      0: {
        breeding: { card: "BT1-015", as: "breedingGreymon" },
        hand: [{ card: "BT22-038", as: "monzaemon" }],
      },
    });
    await control.ready();
    control.state.memory = 5;
    expect(
      control.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: control.perm("breedingGreymon").permanentId,
        instanceId: control.inst("monzaemon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(control.perm("breedingGreymon").topCard.cardId).toBe("BT1-015");
    expect(control.state.memory).toBe(5);
  });

  it("can be chosen by BT15-040 Monzaemon (X Antibody), which plays exactly [Numemon] from hand (Q2517)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-058", as: "base", under: ["BT1-038"] }],
          hand: [
            { card: "BT15-040", as: "monzaemon" },
            { card: "BT1-015", as: "nearMiss" },
            { card: "BT15-035", as: "geremon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("nearMiss").instanceId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("geremon").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT15-040", "BT15-035"]);
  });
});
