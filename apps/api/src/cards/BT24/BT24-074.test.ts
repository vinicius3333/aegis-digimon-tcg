import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_074 } from "./BT24-074.js";
import "../index.js";

describe("BT24-074 SkullSeadramon", () => {
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
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullseadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(targetId);
    expect(s.state.players[1]!.trash).toHaveLength(2);
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
        },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullseadramon").instanceId,
        ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullseadramon").instanceId);
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(6 - cost);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullseadramon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes the emptied Digimon when played by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001", "BT1-002", "BT1-003"] }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("skullseadramon"), { enteredByEffect: 0 });

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.trash).toHaveLength(4);
  });

  it("when digivolving only trashes sources even when entered by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("skullseadramon"), {
      enteredByEffect: 0,
    });

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
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

    await advance(s.engine).verb.deletePermanent([s.perm("skullseadramon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );
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

  it("inherited attack places another Digimon at the bottom to unsuspend its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "host", under: ["BT24-074"] },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costPermanentId = s.perm("cost").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").stack[0]?.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costPermanentId);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
