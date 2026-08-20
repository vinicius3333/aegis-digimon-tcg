import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT24-094 Central Town: Throne Room", () => {
  it("waives color with no face-up security, exchanges the bottom card, and plays TS at cost -3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-094", as: "throneRoom" },
            { card: "BT24-043", as: "eligibleTs" },
            { card: "AD1-001", as: "nonTs" },
          ],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-045", as: "bottomSecurity" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("throneRoom").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligibleTs").instanceId,
      ),
    );

    expect(s.state.memory).toBe(0); // Option cost 3; BT24-043's play cost 3 is reduced to 0.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bottomSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("topSecurity").instanceId);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("throneRoom").instanceId);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonTs").instanceId)).toBe(true);
  });

  it("does not waive color while any security card is face up", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-094", as: "throneRoom" }],
        security: [{ card: "BT1-009", faceUp: true }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("throneRoom").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-094")).toBe(true);
  });

  it("while face-up in security buffs only green/yellow TS and grants Alliance only with Merukimon/Minervamon", async () => {
    const withNamed = setupEngine({
      0: {
        security: [{ card: "BT24-094", as: "throneRoom", faceUp: true }],
        battleArea: [
          { card: "BT24-043", as: "greenTs" },
          { card: "BT24-031", as: "yellowTs" },
          { card: "BT24-051", as: "merukimon" },
          { card: "AD1-001", as: "nonTs" },
        ],
      },
    });
    await withNamed.ready();
    expect(withNamed.perm("greenTs").currentDP).toBe(3000);
    expect(withNamed.perm("yellowTs").currentDP).toBe(3000);
    expect(withNamed.perm("nonTs").currentDP).toBe(5000);
    expect(observe(withNamed.engine).hasKeyword(withNamed.perm("greenTs"), "Alliance")).toBe(true);
    expect(observe(withNamed.engine).hasKeyword(withNamed.perm("yellowTs"), "Alliance")).toBe(true);
    expect(observe(withNamed.engine).hasKeyword(withNamed.perm("nonTs"), "Alliance")).toBe(false);

    const withoutNamed = setupEngine({
      0: {
        security: [{ card: "BT24-094", faceUp: true }],
        battleArea: [{ card: "BT24-043", as: "greenTs" }],
      },
    });
    await withoutNamed.ready();
    expect(withoutNamed.perm("greenTs").currentDP).toBe(3000);
    expect(observe(withoutNamed.engine).hasKeyword(withoutNamed.perm("greenTs"), "Alliance")).toBe(false);
  });

  it("Security optionally plays level 4-or-lower green/yellow TS from hand or trash for free", async () => {
    const fromHand = setupEngine(
      {
        0: {
          security: [{ card: "BT24-094", as: "securityRoom", faceUp: true }],
          hand: [
            { card: "BT24-034", as: "level4Ts" },
            { card: "BT24-049", as: "level5Ts" },
          ],
          trash: [{ card: "BT24-043", as: "trashTs" }],
        },
      },
      { autoSelectCards: true },
    );
    fromHand.state.memory = 1;
    await advance(fromHand.engine).fireForInstance(EffectTiming.SecuritySkill, fromHand.inst("securityRoom"));
    await settle(() =>
      fromHand.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === fromHand.inst("level4Ts").instanceId,
      ),
    );
    expect(fromHand.state.memory).toBe(1);
    expect(
      fromHand.state.players[0]!.hand.some((card) => card.instanceId === fromHand.inst("level5Ts").instanceId),
    ).toBe(true);
    expect(
      fromHand.state.players[0]!.trash.some((card) => card.instanceId === fromHand.inst("trashTs").instanceId),
    ).toBe(true);

    const fromTrash = setupEngine(
      {
        0: {
          security: [{ card: "BT24-094", as: "securityRoom", faceUp: true }],
          trash: [{ card: "BT24-043", as: "trashTs" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(fromTrash.engine).fireForInstance(EffectTiming.SecuritySkill, fromTrash.inst("securityRoom"));
    await settle(() =>
      fromTrash.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === fromTrash.inst("trashTs").instanceId,
      ),
    );
    expect(
      fromTrash.state.players[0]!.trash.some((card) => card.instanceId === fromTrash.inst("trashTs").instanceId),
    ).toBe(false);
  });

  it("may decline the Security play without moving an eligible card", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-094", as: "securityRoom", faceUp: true }],
        hand: [{ card: "BT24-034", as: "eligible" }],
      },
    });
    const firing = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityRoom"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    if (decision === undefined) throw new Error("Security selection decision not found");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
