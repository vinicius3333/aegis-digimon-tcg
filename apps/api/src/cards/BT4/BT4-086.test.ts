import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-086.js";

describe("BT4-086 Cerberusmon: Werewolf Mode", () => {
  it("may delete a Cerberusmon to gain 9 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-086", as: "source" }],
          battleArea: [{ card: "BT4-083", as: "cerberusmon", under: ["BT4-081"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const costId = s.perm("cerberusmon").permanentId;
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !player.battleArea.some((p) => p.permanentId === costId) && s.state.memory === 9);
    expect(player.trash.some((card) => card.cardId === "BT4-083")).toBe(true);
    const played = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("does not treat Werewolf Mode itself or another Werewolf Mode as [Cerberusmon]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-086", as: "source" }],
          battleArea: [{ card: "BT4-086", as: "otherWerewolf" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(player.battleArea).toHaveLength(2);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-086", as: "source" }],
          battleArea: [{ card: "BT4-083", as: "cerberusmon", under: ["BT4-081"] }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const costId = s.perm("cerberusmon").permanentId;
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(player.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(true);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT4-086 Cerberusmon: Werewolf Mode — KB Q&A rulings", () => {
  const playWerewolfAndReadDeletionTargets = async (battleArea: PermanentSpec[]) => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT4-086", as: "source" }], battleArea } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const request = s.decisions.at(-1)!.req;
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId,
    )!;
    return { s, request, played };
  };

  it("cannot delete itself, because [Cerberusmon: Werewolf Mode] is not [Cerberusmon] (Q1231)", async () => {
    const { s, request, played } = await playWerewolfAndReadDeletionTargets([
      { card: "BT4-083", as: "cerberusmon", under: ["BT4-081"] },
      { card: "BT4-083", as: "secondCerberusmon", under: ["BT4-081"] },
    ]);
    const candidates = request.options?.candidateInstanceIds ?? [];

    expect([...candidates].sort()).toEqual(
      [s.perm("cerberusmon").permanentId, s.perm("secondCerberusmon").permanentId].sort(),
    );
    expect(candidates).not.toContain(played.permanentId);

    const alone = setupEngine(
      { 0: { hand: [{ card: "BT4-086", as: "source" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    alone.state.memory = 9;
    expect(alone.engine.applyIntent(0, { type: "playCard", instanceId: alone.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => alone.state.players[0]!.battleArea.length === 1);
    await drainMicrotasks();

    expect(alone.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT4-086"]);
    expect(alone.state.players[0]!.trash).toHaveLength(0);
    expect(alone.state.memory).toBe(0);
  });

  it("cannot delete another [Cerberusmon: Werewolf Mode], because it is not [Cerberusmon] (Q1232)", async () => {
    const { s, request, played } = await playWerewolfAndReadDeletionTargets([
      { card: "BT4-086", as: "otherWerewolf" },
      { card: "BT4-083", as: "cerberusmon", under: ["BT4-081"] },
      { card: "BT4-083", as: "secondCerberusmon", under: ["BT4-081"] },
    ]);
    const candidates = request.options?.candidateInstanceIds ?? [];

    expect([...candidates].sort()).toEqual(
      [s.perm("cerberusmon").permanentId, s.perm("secondCerberusmon").permanentId].sort(),
    );
    expect(candidates).not.toContain(s.perm("otherWerewolf").permanentId);
    expect(candidates).not.toContain(played.permanentId);

    const onlyWerewolves = setupEngine(
      { 0: { hand: [{ card: "BT4-086", as: "source" }], battleArea: [{ card: "BT4-086", as: "otherWerewolf" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    onlyWerewolves.state.memory = 9;
    expect(
      onlyWerewolves.engine.applyIntent(0, { type: "playCard", instanceId: onlyWerewolves.inst("source").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => onlyWerewolves.state.players[0]!.battleArea.length === 2);
    await drainMicrotasks();

    expect(onlyWerewolves.perm("otherWerewolf").topCard?.cardId).toBe("BT4-086");
    expect(onlyWerewolves.state.players[0]!.trash).toHaveLength(0);
    expect(onlyWerewolves.state.memory).toBe(0);
  });
});
