import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("Discord 1557666953748025394 — Bagramon destination choice", () => {
  it.each(["host", "tamer", "secondHost", "secondTamer"])(
    "offers every other host and places under the chosen %s",
    async (chosen) => {
      const s = setupEngine({
        0: {
          hand: [{ card: "EX10-056", as: "bagramon" }],
          trash: [{ card: "BT10-073", as: "trashMaterial" }],
          battleArea: [{ card: "EX10-064", as: "expander", under: [{ card: "EX10-058", as: "underMaterial" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", under: [{ card: "BT1-013", as: "shed" }] },
            { card: "BT1-014", as: "host" },
            { card: "BT1-088", as: "tamer", under: [{ card: "BT1-013", as: "existing" }] },
            { card: "BT1-013", as: "secondHost" },
            { card: "BT1-085", as: "secondTamer" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      });
      s.state.memory = 2;
      await s.ready();
      const answer = (
        response:
          | { kind: "optional"; accept: boolean }
          | { kind: "chooseTargets" | "selectCards"; instanceIds: string[] },
      ) => {
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response,
          }),
        ).toEqual({ ok: true });
      };
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("bagramon").instanceId,
          digiXros: {
            materialInstanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
            expanderPermanentIds: [s.perm("expander").permanentId],
          },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.perm("expander").isSuspended).toBe(true);
      expect(s.perm("expander").stack).toHaveLength(0);
      expect(s.state.memory).toBe(-7);
      answer({ kind: "optional", accept: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const sourceDecision = s.state.pendingDecision!.decisionId;
      answer({ kind: "chooseTargets", instanceIds: [s.perm("victim").permanentId] });
      await settle(
        () => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== sourceDecision,
      );
      expect(s.state.pendingDecision!.kind).toBe("chooseTargets");
      const destinations = JSON.parse(s.state.pendingDecision!.payloadJson).candidateInstanceIds;
      expect(destinations.sort()).toEqual(
        ["host", "tamer", "secondHost", "secondTamer"].map((alias) => s.perm(alias).permanentId).sort(),
      );
      const victimId = s.perm("victim").topCard.instanceId;
      answer({ kind: "chooseTargets", instanceIds: [s.perm(chosen).permanentId] });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.perm(chosen).stack[0]!.instanceId).toBe(victimId);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("shed").instanceId]);
      expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX10-056");
      expect(JSON.parse(s.state.pendingDecision!.payloadJson).timing).toBe("AllTurns");
      answer({ kind: "optional", accept: true });
      const materials = [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId];
      await settle(() => s.state.pendingDecision === undefined);
      const bagramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-056")!;
      expect(bagramon.stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(materials.sort());
      expect(s.state.players[1]!.security).toHaveLength(1);
    },
  );

  it.each(["BT1-014", "BT1-088"])("keeps a singleton %s destination usable", async (hostCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX10-056", as: "bagramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: hostCard, as: "host" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId, s.perm("host").permanentId);
    s.state.memory = 10;
    await s.ready();
    const top = s.perm("victim").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").stack.length === 1);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([top]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does nothing when the only opposing permanent is the selected source", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX10-056", as: "bagramon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", under: [{ card: "BT1-013", as: "source" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("victim").permanentId,
    ]);
    expect(s.perm("victim").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("Q5144: choosing a printed immune host never retargets onto a healthy Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX10-056", as: "bagramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", under: [{ card: "BT1-013", as: "source" }] },
            { card: "EX10-010", as: "immune" },
            { card: "BT1-088", as: "healthy" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId, s.perm("immune").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(s.perm("victim").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.perm("healthy").stack).toHaveLength(0);
    expect(s.perm("immune").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(
      s.decisions.some(
        ({ req }) =>
          req.kind === "chooseTargets" &&
          req.options?.candidateInstanceIds?.includes(s.perm("immune").permanentId) &&
          !req.options.candidateInstanceIds.includes(s.perm("victim").permanentId),
      ),
    ).toBe(true);
  });

  it("lets the player pay any two of three physical sources after When Digivolving placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT10-081",
            as: "base",
            under: [
              { card: "BT1-013", as: "keep" },
              { card: "BT1-014", as: "pay" },
            ],
          },
        ],
        hand: [{ card: "EX10-056", as: "bagramon" }],
        deck: ["BT1-085"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "victim" },
          { card: "BT1-088", as: "host" },
          { card: "BT1-014", as: "other" },
        ],
        security: ["BT1-009", "BT1-013"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseTop = s.perm("base").topCard.instanceId;
    const answer = (
      response:
        | { kind: "optional"; accept: boolean }
        | { kind: "chooseTargets" | "selectCards"; instanceIds: string[] },
    ) => {
      expect(
        s.engine.applyIntent(0, { type: "respondDecision", decisionId: s.state.pendingDecision!.decisionId, response }),
      ).toEqual({ ok: true });
    };
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bagramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    answer({ kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decisionId = s.state.pendingDecision!.decisionId;
    answer({ kind: "chooseTargets", instanceIds: [s.perm("victim").permanentId] });
    await settle(() => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== decisionId);
    expect(s.state.pendingDecision!.kind).toBe("chooseTargets");
    answer({ kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    answer({ kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      min: 2,
      max: 2,
      candidateInstanceIds: expect.arrayContaining([baseTop, s.inst("keep").instanceId, s.inst("pay").instanceId]),
    });
    decisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds: [baseTop] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.pendingDecision!.decisionId).toBe(decisionId);
    expect(s.perm("base").stack).toHaveLength(3);
    answer({ kind: "selectCards", instanceIds: [baseTop, s.inst("pay").instanceId] });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("keep").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [baseTop, s.inst("pay").instanceId].sort(),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("consumes the expansion for this play and cannot reuse a suspended Yuu & Nene", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-064",
              as: "expander",
              under: [
                { card: "EX10-058", as: "underA" },
                { card: "EX10-058", as: "underB" },
              ],
            },
          ],
          trash: [
            { card: "BT10-073", as: "trashA" },
            { card: "BT10-073", as: "trashB" },
          ],
          hand: [
            { card: "EX10-056", as: "first" },
            { card: "EX10-056", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 18;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("first").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("underA").instanceId, s.inst("trashA").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(9);
    const materials = [s.inst("underB").instanceId, s.inst("trashB").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("second").instanceId,
        digiXros: { materialInstanceIds: materials, expanderPermanentIds: [s.perm("expander").permanentId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("second").instanceId,
        digiXros: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("expander").stack.map(({ instanceId }) => instanceId)).toEqual([materials[0]]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([materials[1]]);
    expect(s.state.memory).toBe(9);
  });
});
