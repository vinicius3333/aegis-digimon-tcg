import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-024.js";
import "./BT10-025.js";
import "./BT10-026.js";
import "./BT10-088.js";
import "./BT10-111.js";

describe("Blue Flare with Shoutmon King Version through BT10", () => {
  it("chains Kiriha material, DeckerGreymon control, Cyberdramon Hand Main, and Armor Purge", async () => {
    const preferredMaterialIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-021", as: "blueFlareBase", suspended: true },
            { card: "BT10-088", as: "kiriha", under: ["BT10-020"] },
          ],
          hand: [
            { card: "BT10-026", as: "deckerGreymon" },
            { card: "BT10-025", as: "cyberdramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "restrictedTarget" },
            { card: "BT1-011", as: "unrestrictedTarget" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredMaterialIds,
      },
    );
    s.state.memory = 7;
    preferredMaterialIds.push(s.perm("kiriha").stack[0]!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueFlareBase").permanentId,
        instanceId: s.inst("deckerGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("blueFlareBase").topCard.cardId === "BT10-026" &&
        s.perm("blueFlareBase").stack.some((card) => card.cardId === "BT10-020") &&
        observe(s.engine).isRestricted(s.perm("restrictedTarget"), "attack") &&
        observe(s.engine).isRestricted(s.perm("restrictedTarget"), "block"),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("kiriha").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("unrestrictedTarget"), "attack")).toBe(false);

    const cyberdramon = s.inst("cyberdramon");
    const [handMain] = JSON.parse(cyberdramon.activatableEffectsJson) as Array<{
      effectKey: string;
    }>;
    expect(handMain).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: cyberdramon.instanceId,
        effectKey: handMain!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("blueFlareBase").stack.some((card) => card.instanceId === cyberdramon.instanceId) &&
        !s.perm("blueFlareBase").isSuspended,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("blueFlareBase").isSuspended).toBe(false);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("blueFlareBase").permanentId])).toBe(0);

    expect(s.perm("blueFlareBase").topCard.cardId).toBe("BT10-021");
    expect(s.perm("blueFlareBase").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT10-020", "BT10-025"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT10-026");
  });

  it("uses King Version as a substitute but Material Saves only the printed MailBirdramon requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-021", as: "mailbirdramon" },
            { card: "BT10-088", as: "kiriha" },
          ],
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "zeroSources" },
            { card: "BT1-011", as: "twoSources", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-012", as: "threeSources", under: ["BT1-003", "BT1-004", "BT1-005"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kingVersion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId));
    const king = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("kingVersion").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(king, "DigiXrosSubstitute"));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [king.topCard.instanceId, s.perm("mailbirdramon").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      ["zeroSources", "twoSources"].every(
        (alias) =>
          observe(s.engine).isRestricted(s.perm(alias), "attack") &&
          observe(s.engine).isRestricted(s.perm(alias), "block"),
      ),
    );

    expect(observe(s.engine).isRestricted(s.perm("zeroSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "attack")).toBe(false);
    await settle();

    const metalGreymon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-024")!;
    expect(observe(s.engine).hasKeyword(metalGreymon, "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: metalGreymon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(metalGreymon.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT10-111", "BT10-021"]));
    expect(await advance(s.engine).verb.deletePermanent([metalGreymon.permanentId])).toBe(1);
    await settle(() => s.perm("kiriha").stack.length === 1);

    expect(s.perm("kiriha").stack.map((card) => card.cardId)).toEqual(["BT10-021"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-111")).toBe(true);
  });
});
