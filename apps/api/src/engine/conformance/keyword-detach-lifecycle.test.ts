import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

// Current primary source: Comprehensive Rules v4.2, §16-46 (header updated 2026-08-18; changelog 2026-08-07).
// https://world.digimoncard.com/rule/pdf/general_rule.pdf
describe("Detach departure lifecycle", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0323",
      "16-46: non-owner departure, specified linked payment and mandatory prevention after payment",
      "58b545c8005fcef5c0c20be0fae48f94034c24c1d66eaa211b23f1791069ffff",
    );
  });
  it.each(["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"])(
    "%s may trash a specified link to prevent deletion by the opponent's Option",
    async (card) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-010", as: "redSource" }],
            hand: [{ card: "ST1-16", as: "gaiaForce" }],
          },
          1: {
            battleArea: [{ card, as: "mailmon", linked: [{ card: "BT26-010", as: "sevenCodeLink" }] }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const optionId = s.inst("gaiaForce").instanceId;
      const targetId = s.perm("mailmon").permanentId;
      const linkId = s.inst("sevenCodeLink").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
      );
      expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
      expect(s.perm("mailmon").linked).toHaveLength(0);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(linkId);
    },
  );
  it.each([
    ["return to hand", "ST2-16", "BT1-043"],
    ["return to deck", "BT2-102", "BT1-067"],
    ["placement in security", "BT10-101", "BT1-045"],
  ])("prevents opponent %s after paying one eligible link", async (_label, option, source) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: source }], hand: [{ card: option, as: "option" }] },
        1: {
          battleArea: [{ card: "BT26-019", as: "target", suspended: true, linked: [{ card: "BT26-010", as: "link" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("target").permanentId;
    const linkId = s.inst("link").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
    expect(s.perm("target").linked).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(linkId);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("only the threatened Digimon's controller can decline Detach", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009" }], hand: [{ card: "ST1-16", as: "option" }] },
      1: { battleArea: [{ card: "BT26-019", as: "target", linked: [{ card: "BT26-010", as: "link" }] }] },
    });
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const targetInstanceId = s.perm("target").topCard.instanceId;
    const linkId = s.inst("link").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.seat).toBe(1);
    expect(request.sourceCardId).toBe("BT26-019");
    expect(request.options?.effectText).toContain("Detach");
    expect(request.options?.effectText).toContain("Seven Code");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([targetInstanceId, linkId]),
    );
  });

  it("does not offer payment using a link without the specified trait", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009" }], hand: [{ card: "ST1-16", as: "option" }] },
        1: { battleArea: [{ card: "BT26-019", linked: [{ card: "BT21-009" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("does not prevent the owner's own deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-019", as: "target", linked: [{ card: "BT26-010", as: "link" }] }],
          breeding: { card: "BT2-067" },
          hand: [{ card: "ST6-15", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-010" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("target").permanentId;
    const targetInstanceId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(targetId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
  });
  it.each([
    { links: [], accept: true },
    { links: [], accept: false },
    { links: ["BT21-009"], accept: true },
    { links: ["BT21-009"], accept: false },
  ])(
    "offers the processing choice with unpayable links $links (accept=$accept) without preventing deletion",
    async ({ links, accept }) => {
      cite(
        "comprehensive-0170",
        "15-7-4: impossible Detach payment still offers a processing choice",
        "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
      );
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-009" }], hand: [{ card: "ST1-16", as: "option" }] },
          1: { battleArea: [{ card: "BT26-019", as: "target", linked: links }] },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      const targetId = s.perm("target").topCard.instanceId;
      const linkIds = s.perm("target").linked.map(({ instanceId }) => instanceId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
      );
      const choices = s.decisions.filter(({ req }) => req.sourceCardId === "BT26-019" && req.kind === "optional");
      expect(choices).toHaveLength(1);
      expect(choices[0]!.req.seat).toBe(1);
      expect(choices[0]!.req.options?.effectText).toContain("Detach");
      expect(choices[0]!.req.options?.effectText).toContain("Seven Code");
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([targetId, ...linkIds]),
      );
      expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
    },
  );
});
