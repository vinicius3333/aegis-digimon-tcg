import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Dominimon", () => {
  it("contains the security search/play and Angel protection clauses in typed IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("SearchSecurity");
    expect(text).toContain("PlayWithoutCost");
    expect(text).toContain("trashSecurityTop");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "SearchSecurity", then: { optional: true } },
      { kind: "ModifyDP", amount: -7000, duration: "forTheTurn" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      affectsAll: true,
      leaveCause: "otherThanBattle",
    });
  });

  it("publicly evolves Dominimon from level 5, pays four memory, and reduces an opposing Digimon by 7000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-021", as: "base" }], hand: [{ card: "EX6-030", as: "dom" }] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dom").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("dom").instanceId);
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-021"]);
  });

  it("may play a level 5 Angel found in security after evolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-021", as: "base" }],
          hand: [{ card: "EX6-030", as: "dom" }],
          security: [{ card: "EX6-019", as: "securityAngel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dom").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("securityAngel").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("publicly prevents an Angel's non-battle deletion by trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-019", as: "angel" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("still applies the DP reduction when no eligible Angel is found in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-030", as: "dom" }], security: ["BT1-093"] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dom"));
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly exposes Dominimon's Rule-granted Angel trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-030", as: "dom" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("dom"), "Angel")).toBe(true);
  });

  it("does not replace a battle deletion with the security payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-017", as: "angel" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byBattle");
    await settle(() =>
      s.state.players[0]!.battleArea.every((perm) => perm.topCard?.instanceId !== s.inst("angel").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("publicly protects simultaneous Angel deletions with one security payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-030", as: "dom" },
            { card: "EX6-019", as: "angelOne" },
            { card: "EX6-019", as: "angelTwo" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent(
      [s.perm("angelOne").permanentId, s.perm("angelTwo").permanentId],
      "byEffect",
    );
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angelOne").instanceId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angelTwo").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("EX6-030 Dominimon — KB Q&A rulings", () => {
  it("still gives -7000 DP after declining to play the Angel found in security (Q3748)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-030", as: "dom" }],
          security: [{ card: "EX6-019", as: "securityAngel" }],
        },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dom"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await resolving;
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityAngel").instanceId]);
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
  });

  async function protectedAngels(count: number) {
    const angels = Array.from({ length: count }, (_, index) => ({ card: "EX6-019", as: `angel${index}` }));
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-030", as: "dom" }, ...angels], security: ["BT1-009", "BT1-010", "BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const onBoard = (alias: string) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst(alias).instanceId);
    return { s, aliases: angels.map(({ as }) => as), onBoard };
  }

  it.each(["hand", "deck"] as const)(
    "treats a return to the %s as leaving other than by battle and prevents it (Q3749)",
    async (route) => {
      const { s, onBoard } = await protectedAngels(1);
      const instanceId = s.inst("angel0").instanceId;
      if (route === "hand") await advance(s.engine).verb.returnToHand([instanceId]);
      else await advance(s.engine).verb.returnToDeck([instanceId]);
      await settle(() => s.state.pendingDecision === undefined);
      expect(onBoard("angel0")).toBe(true);
      expect(s.state.players[0]!.security).toHaveLength(2);
    },
  );

  it("prevents every Angel returned at the same time with a single security trash (Q3750)", async () => {
    const { s, aliases, onBoard } = await protectedAngels(2);
    await advance(s.engine).verb.returnToHand(aliases.map((alias) => s.inst(alias).instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    expect(aliases.every(onBoard)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
