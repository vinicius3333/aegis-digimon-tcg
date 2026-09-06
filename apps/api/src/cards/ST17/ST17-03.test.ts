import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-03 Lopmon", () => {
  it("gives one of your Digimon Alliance for the turn from its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "AD1-001", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance"));

    expect(observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance")).toBe(true);
  });

  it("applies its inherited +1000 DP bonus to a suspended host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03", as: "host", suspended: true, under: ["ST17-02"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("uses Alliance in a real attack by suspending an eligible ally and adding its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "ST1-10", as: "ally" },
          ],
        },
        1: { security: ["ST1-09", "ST1-09"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lopmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      permanentId: s.perm("lopmon").permanentId,
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "allianceResolved")).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("lopmon").topCard?.cardId).toBe("ST17-03");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lopmon").permanentId),
    ).toBe(true);
  });
});
