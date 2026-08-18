import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-073.js";
import "./BT7-075.js";
import "./BT7-079.js";
import "./BT7-091.js";

describe("BT7 Purple Hybrid Cherubimon historical deck", () => {
  it("chains Koichi, reduced evolution, Tamer toolbox deletion, and scaled On Deletion plays", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-091", as: "koichiBase" },
            { card: "BT3-096", as: "existingTamer" },
          ],
          hand: [
            { card: "BT7-073", as: "kaiserLeomon" },
            { card: "BT7-075", as: "rhihimon" },
            { card: "BT7-079", as: "cherubimon" },
          ],
          deck: [{ card: "BT1-001", as: "koichiDiscard" }, "BT1-002", "BT1-003"],
          trash: [
            { card: "BT7-091", as: "playedKoichi" },
            { card: "BT3-096", as: "keptMimi" },
            { card: "BT2-067", as: "playedRookieOne" },
            { card: "BT2-068", as: "playedRookieTwo" },
            { card: "BT2-069", as: "keptRookie" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT7-069", as: "firstLevelFour" },
            { card: "BT7-070", as: "secondLevelFour" },
            { card: "BT7-072", as: "keptLevelFour" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    const hostPermanentId = s.perm("koichiBase").permanentId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostPermanentId,
      instanceId: s.inst("kaiserLeomon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("koichiBase").topCard.cardId === "BT7-073" &&
      observe(s.engine).hasKeyword(s.perm("koichiBase"), "Retaliation")
    );
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostPermanentId,
      instanceId: s.inst("rhihimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("koichiBase").topCard.cardId === "BT7-075");
    await settle();
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostPermanentId,
      instanceId: s.inst("cherubimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const playTamerOptional = s.decisions.at(-1)!.req;
    expect(playTamerOptional.sourceCardId).toBe("BT7-079");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: playTamerOptional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const tamerDecision = s.decisions.at(-1)!.req;
    expect(new Set(tamerDecision.options?.candidateInstanceIds)).toEqual(new Set([
      s.inst("playedKoichi").instanceId,
      s.inst("keptMimi").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: tamerDecision.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("playedKoichi").instanceId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) =>
      req.decisionId !== tamerDecision.decisionId &&
      req.kind === "selectCards" &&
      req.sourceCardId === "BT7-091"
    ));

    const koichiDiscardDecision = s.decisions.find(({ req }) =>
      req.decisionId !== tamerDecision.decisionId &&
      req.kind === "selectCards" &&
      req.sourceCardId === "BT7-091"
    )!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: koichiDiscardDecision.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("koichiDiscard").instanceId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) =>
      req.decisionId !== playTamerOptional.decisionId &&
      req.kind === "optional" &&
      req.sourceCardId === "BT7-079"
    ));

    const deleteOptional = s.decisions.filter(({ req }) =>
      req.decisionId !== playTamerOptional.decisionId &&
      req.kind === "optional" &&
      req.sourceCardId === "BT7-079"
    ).at(-1)!.req;
    expect(deleteOptional.sourceCardId).toBe("BT7-079");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: deleteOptional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const deleteDecision = s.decisions.at(-1)!.req;
    expect(deleteDecision.options?.max).toBe(2);
    expect(new Set(deleteDecision.options?.candidateInstanceIds)).toEqual(new Set([
      s.perm("firstLevelFour").permanentId,
      s.perm("secondLevelFour").permanentId,
      s.perm("keptLevelFour").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: deleteDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [
          s.perm("firstLevelFour").permanentId,
          s.perm("secondLevelFour").permanentId,
        ],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.length === 1 &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(
      s.perm("keptLevelFour").permanentId,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) =>
      topCard.cardId === "BT7-091" || topCard.cardId === "BT3-096"
    )).toHaveLength(2);

    const deletion = advance(s.engine).verb.deletePermanent([hostPermanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const rookieOptional = s.decisions.at(-1)!.req;
    expect(rookieOptional.sourceCardId).toBe("BT7-079");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: rookieOptional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const rookieDecision = s.decisions.at(-1)!.req;
    expect(rookieDecision.options?.max).toBe(2);
    expect(new Set(rookieDecision.options?.candidateInstanceIds)).toEqual(new Set([
      s.inst("playedRookieOne").instanceId,
      s.inst("playedRookieTwo").instanceId,
      s.inst("keptRookie").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: rookieDecision.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [
          s.inst("playedRookieOne").instanceId,
          s.inst("playedRookieTwo").instanceId,
        ],
      },
    })).toEqual({ ok: true });
    await deletion;
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) =>
        topCard.instanceId === s.inst("playedRookieOne").instanceId
      ) &&
      s.state.players[0]!.battleArea.some(({ topCard }) =>
        topCard.instanceId === s.inst("playedRookieTwo").instanceId
      )
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) =>
      instanceId === s.inst("keptRookie").instanceId
    )).toBe(true);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });
});
