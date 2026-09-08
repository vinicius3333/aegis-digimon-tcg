import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_074 } from "./BT24-074.js";
import "../index.js";

describe("BT24-074 SkullSeadramon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-074")).toMatchObject({
      cardId: "BT24-074",
      nameEn: "SkullSeadramon",
      colors: ["Purple", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Titan", "TS", "Aquatic"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("trashes digivolution cards before the effect-play deletion branch", () => {
    const onPlay = BT24_074.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3 });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "triggerEnteredByEffect" },
      target: { filter: { digivolutionCards: "none" }, count: 1 },
    });
    const inherited = BT24_074.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        targetIsPermanent: true,
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
  });

  it("public play pays 7, trashes up to three sources, and does not take the effect-play branch", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: {
          battleArea: [
            { card: "BT1-043", as: "target", under: ["BT1-028", "BT1-032", "BT1-038"] },
            { card: "BT1-043", as: "neighbor", under: ["BT1-028", "BT1-032", "BT1-038"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const neighborId = s.perm("neighbor").permanentId;
    const sourceIds = s.perm("target").stack.map((card) => card.instanceId);
    const neighborStackIds = s.perm("neighbor").stack.map((card) => card.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullseadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(targetId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(neighborId);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual(neighborStackIds);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([...sourceIds].reverse());
  });

  it.each([
    ["normal purple level-4 requirement at cost 4", "BT24-070", 4, undefined],
    ["normal blue level-4 requirement at cost 4", "BT1-032", 4, undefined],
    ["alternate Aqua-in-trait requirement at cost 3", "BT15-025", 3, 0],
    ["alternate Sea Animal requirement at cost 3", "BT1-033", 3, 1],
    ["alternate TS requirement without matching color at cost 3", "BT24-010", 3, 2],
  ])("uses the %s", async (_label, baseCard, cost, alternateRequirementIndex) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT24-074", as: "skullseadramon" }],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        },
        1: { battleArea: [{ card: "BT1-043", as: "target", under: ["BT1-028", "BT1-032", "BT1-038"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    const targetSourceIds = s.perm("target").stack.map((card) => card.instanceId);
    const evolvedId = s.inst("skullseadramon").instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullseadramon").instanceId,
        ...(alternateRequirementIndex === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullseadramon").instanceId);
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(6 - cost);
    expect(s.perm("base").topCard.instanceId).toBe(evolvedId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([...targetSourceIds].reverse());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("public Dead or Alive effect-play trashes sources before deleting the emptied target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-043", as: "target", under: ["BT1-028", "BT1-032", "BT1-038"] },
            { card: "BT1-043", as: "neighbor", under: ["BT1-028", "BT1-032", "BT1-038"] },
          ],
        },
        1: {
          battleArea: [{ card: "BT10-071", as: "source" }],
          trash: [{ card: "BT24-074", as: "skullseadramon" }],
          hand: [{ card: "BT7-109", as: "deadOrAlive" }],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const neighborId = s.perm("neighbor").permanentId;
    const targetTopId = s.perm("target").topCard.instanceId;
    const sourceIds = s.perm("target").stack.map((card) => card.instanceId);
    const neighborStackIds = s.perm("neighbor").stack.map((card) => card.instanceId);
    const optionId = s.inst("deadOrAlive").instanceId;
    const playedId = s.inst("skullseadramon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(neighborId);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual(neighborStackIds);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      [...sourceIds].reverse().concat(targetTopId),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(playedId);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("when digivolving only trashes sources even when entered by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT1-043", as: "target", under: ["BT1-028", "BT1-032", "BT1-038"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("skullseadramon"), {
      enteredByEffect: 0,
    });

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it.each([
    ["level 4 Seadramon", "BT15-025"],
    ["level 4 TS Digimon without Seadramon in its name", "BT24-010"],
  ])("Q5652: public deletion plays a %s from trash", async (_label, reviveCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon" }],
          trash: [{ card: reviveCard, as: "revive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const hostInstanceId = s.inst("skullseadramon").instanceId;
    const revivedInstanceId = s.inst("revive").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("skullseadramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === hostInstanceId));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revivedInstanceId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostInstanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      revivedInstanceId,
    );
  });

  it("Q5652: public opponent deletion revives the exact eligible trash instance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon", dp: 1000 }],
          trash: [{ card: "BT15-025", as: "revive" }],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostInstanceId = s.inst("skullseadramon").instanceId;
    const revivedInstanceId = s.inst("revive").instanceId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === hostInstanceId));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revivedInstanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostInstanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      revivedInstanceId,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
  });

  it("Q5652: public refusal leaves the eligible revival card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon", dp: 1000 }],
          trash: [{ card: "BT15-025", as: "revive" }],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostInstanceId = s.inst("skullseadramon").instanceId;
    const revivedInstanceId = s.inst("revive").instanceId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === hostInstanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostInstanceId, revivedInstanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
  });

  it("Q5652: public revival selects one preferred eligible card and leaves the other in trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon", dp: 1000 }],
          trash: [
            { card: "BT15-025", as: "seadramon" },
            { card: "BT24-010", as: "tsCandidate" },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.inst("skullseadramon").instanceId;
    const preferredId = s.inst("tsCandidate").instanceId;
    const remainingId = s.inst("seadramon").instanceId;
    preferred.push(preferredId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === preferredId));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(preferredId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostId, remainingId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(preferredId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5652: does not play a near-matching level 4 Sea Beast", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon" }],
          trash: [{ card: "BT1-034", as: "seaBeast" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("skullseadramon").permanentId], "byEffect");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("seaBeast").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("inherited attack suppresses a same-turn repeat and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-089", as: "host", under: ["BT24-074"] },
            { card: "BT1-009", as: "costA" },
            { card: "BT1-015", as: "costB" },
          ],
          deck: ["BT1-016", "BT1-017"],
        },
        1: {
          security: [
            { card: "BT1-011", as: "securityA" },
            { card: "BT1-012", as: "securityB" },
            { card: "BT1-013", as: "securityC" },
          ],
          deck: ["BT1-016", "BT1-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostTopId = s.perm("host").topCard.instanceId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const costAId = s.inst("costA").instanceId;
    const costBId = s.inst("costB").instanceId;
    const securityIds = ["securityA", "securityB", "securityC"].map((alias) => s.inst(alias).instanceId);

    preferred.push(s.perm("costA").permanentId);
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityIds[0]);
    expect(s.perm("host").topCard.instanceId).toBe(hostTopId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([costAId, sourceId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === costAId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityIds[1]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([costAId, sourceId]);
    expect(s.perm("host").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, s.perm("costB").permanentId);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 3 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityIds[2]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("host").topCard.instanceId).toBe(hostTopId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([costBId, costAId, sourceId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === costBId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("public inherited refusal leaves the host suspended and the offered cost in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-089", as: "host", under: ["BT24-074"] },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const costId = s.perm("cost").permanentId;
    const securityId = s.inst("security").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 && !observe(s.engine).isAttacking(),
    );

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(costId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
