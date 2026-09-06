import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22 resolved keyword outcomes", () => {
  it.each(["ST22-02", "ST22-03"])("%s supplies inherited Barrier to a legal host", async (source) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: source === "ST22-02" ? "ST22-03" : "ST22-04", as: "host", under: [source] }],
        security: ["ST1-02"],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it.each([true, false])("GrandGalemon Fortitude requires evolution cards (has sources=%s)", async (hasSources) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-13", as: "grand", under: hasSources ? ["ST4-07"] : [] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const grand = s.perm("grand");
    const instanceId = grand.topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([grand.permanentId], "byEffect");
    const replayed = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === instanceId);
    expect(replayed !== undefined).toBe(hasSources);
    expect(replayed?.permanentId).not.toBe(grand.permanentId);
    expect(replayed?.stack.length).toBe(hasSources ? 0 : undefined);
  });

  it.each([true, false])(
    "GrandGalemon's inherited unsuspend checks opposing unsuspended Digimon (%s)",
    async (suspended) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "ST18-12", as: "host", under: ["ST22-13"] }] },
          1: { battleArea: [{ card: "ST1-02", suspended }], security: ["ST1-02", "ST1-02"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("host").isSuspended).toBe(!suspended);
    },
  );

  it("DoGatchmon redirects its player attack to the highest-DP unsuspended Digimon with Raid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-12", as: "dogatchmon" }] },
        1: {
          battleArea: [
            { card: "ST5-06", as: "highest" },
            { card: "ST1-02", as: "lower" },
          ],
          security: ["ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const highestId = s.perm("highest").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dogatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"));
    expect(s.events.find((e) => e.kind === "combatResolved")).toMatchObject({ deletedPermanentIds: [highestId] });
    expect(
      s.events.some(
        (e) => e.kind === "attackDeclared" && e.target.kind === "permanent" && e.target.permanentId === highestId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["ST1-02"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Defense Plug-In links, grants Reboot through the next opponent turn, then expires its temporary DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST22-11", as: "option" }],
          battleArea: [{ card: "ST5-06", as: "host" }],
          deck: ["BT1-002", "BT1-002"],
        },
        1: { deck: ["BT1-002", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(s.perm("host").linked.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(9000);
    await advance(s.engine).runTurn(0);
    s.perm("host").isSuspended = true;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });
});
