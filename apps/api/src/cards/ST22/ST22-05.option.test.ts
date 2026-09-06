import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-05 Sakuyamon Option-use windows", () => {
  it("uses an eligible Onmyōjutsu Option from hand after creating its token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-05", as: "sakuyamon" },
            { card: "ST22-10", as: "option" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId.includes("TOKEN")) &&
        !s.state.players[0]!.hand.some((card) => card.cardId === "ST22-10"),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "ST22-10")).toBe(true);
  });

  it("declines the optional Option use and leaves an eligible hand card available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-05", as: "sakuyamon" },
            { card: "ST22-10", as: "option" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId.includes("TOKEN")));
    expect(
      s.decisions.some(
        ({ req }) =>
          req.kind === "optional" && req.sourceCardId === "ST22-05" && req.promptText === "Use option without cost",
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("keeps the blue Plug-In in hand when no Tamer satisfies its waiver", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-05", as: "sakuyamon" },
            { card: "ST22-09", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId.includes("TOKEN"))).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(
      s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(s.inst("option").instanceId)),
    ).toBe(false);
  });

  it("uses a face-up Plug-In Option from under a Tamer when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-07", as: "rika", under: [{ card: "ST22-09", as: "option", faceUp: true }] },
            { card: "ST22-05", as: "sakuyamon" },
          ],
          security: ["BT1-001"],
          deck: ["BT1-009"],
        },
        1: { security: ["ST1-09", "ST1-09"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.perm("rika").stack).toHaveLength(0);
    expect(s.perm("sakuyamon").linked.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    const alliance = s.events.find((event) => event.kind === "alliancePrompt");
    if (alliance?.kind !== "alliancePrompt") throw new Error("Alliance prompt missing");
    expect(alliance.permanentId).toBe(s.perm("sakuyamon").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: alliance.eligibleAllyIds[0] })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
