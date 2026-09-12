import { dnaDigivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-045.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-057.js";
import "../BT1/BT1-059.js";
import "../BT1/BT1-089.js";
import "../BT3/BT3-083.js";
import "../BT10/BT10-079.js";
import "./P-187.js";

describe("P-187 Mastemon", () => {
  it("recovers independently of DNA and conditionally places any other Digimon or Tamer for DNA", () => {
    const card = runtimeCompiledCard("P-187")!;
    expect(dnaDigivolutionRequirementsFor("P-187")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
    ]);
    expect(
      card.effects.find(
        (effect) => effect.trigger === "WhenDigivolving" && effect.actions?.[0]?.kind === "SecurityManipulation",
      ),
    ).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 }],
    });
    const dnaEffect = card.effects.find(
      (effect) =>
        effect.actions?.[0]?.kind === "SecurityManipulation" &&
        effect.actions[0].condition?.kind === "isDnaDigivolving",
    );
    expect(dnaEffect).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "isDnaDigivolving" },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            destination: "security",
            position: "choice",
            target: {
              count: 1,
              filter: { controller: "any", excludeSelf: true, kind: ["Digimon", "Tamer"], zone: "battleArea" },
            },
          },
        },
      ],
    });
  });

  it("shares one once-per-turn top-security cost across digivolving and attacking", () => {
    const card = runtimeCompiledCard("P-187")!;
    const effects = card.effects.filter(
      (effect) => effect.trigger === "WhenDigivolving" || effect.trigger === "WhenAttacking",
    );
    expect(effects).toHaveLength(4);
    const plays = effects.filter((effect) => effect.actions?.[0]?.kind === "PlayWithoutCost");
    expect(plays).toHaveLength(2);
    expect(plays.map((effect) => effect.sharedUseKey)).toEqual([
      "trashSecurityPlayDigimon",
      "trashSecurityPlayDigimon",
    ]);
    expect(plays[0]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "trash",
            target: { count: 1, filter: { controller: "mine", zone: "security", position: "top" } },
          },
          target: { count: 1, filter: { colors: ["Yellow", "Purple"], dp: { op: "lte", value: 6000 } } },
        },
      ],
    });
  });

  it("publicly digivolves for 5, recovers the regular deck top, and retains its parent source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "purpleParent" }],
          hand: [{ card: "P-187", as: "mastemon" }],
          security: [{ card: "BT1-048", as: "securityTop" }, "BT1-067", { card: "BT1-068", as: "thirdSecurity" }],
          deck: ["BT1-010", { card: "BT1-009", as: "recovery" }, ...Array(18).fill("BT1-010")],
        },
        1: { security: Array(5).fill("BT1-011"), deck: Array(20).fill("BT1-012") },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const parentPermanentId = s.perm("purpleParent").permanentId;
    const parentSourceId = s.inst("purpleParent").instanceId;
    const mastemonId = s.inst("mastemon").instanceId;
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: parentPermanentId, instanceId: mastemonId }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("purpleParent").topCard.instanceId === mastemonId && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
    expect(s.perm("purpleParent").permanentId).toBe(parentPermanentId);
    expect(s.perm("purpleParent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("shares the security cost from digivolving through the same resident's attack, then resets naturally", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "purpleParent" }],
          hand: [
            { card: "P-187", as: "mastemon" },
            { card: "BT1-045", as: "handCandidate" },
            { card: "BT1-059", as: "tooLarge" },
          ],
          trash: [{ card: "BT3-083", as: "trashCandidate" }],
          security: [
            { card: "BT1-048", as: "recoveredCost" },
            { card: "BT1-067", as: "secondCost" },
            { card: "BT1-068", as: "thirdSecurity" },
          ],
          deck: ["BT1-010", { card: "BT1-009", as: "recovery" }, ...Array(18).fill("BT1-010")],
        },
        1: { security: Array(5).fill("BT1-011"), deck: Array(20).fill("BT1-012") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handCandidate").instanceId);
    const parentPermanentId = s.perm("purpleParent").permanentId;
    const parentSourceId = s.inst("purpleParent").instanceId;
    const mastemonId = s.inst("mastemon").instanceId;
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: parentPermanentId, instanceId: mastemonId }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("purpleParent").topCard.instanceId === mastemonId && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("recoveredCost").instanceId,
      s.inst("secondCost").instanceId,
      s.inst("thirdSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("handCandidate").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashCandidate").instanceId);
    expect(s.perm("purpleParent").permanentId).toBe(parentPermanentId);
    expect(s.perm("purpleParent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);

    const firstSecurityChecks = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: parentPermanentId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === firstSecurityChecks + 1 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("recoveredCost").instanceId,
      s.inst("secondCost").instanceId,
      s.inst("thirdSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondCost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashCandidate").instanceId);
    expect(s.perm("purpleParent").permanentId).toBe(parentPermanentId);
    expect(s.perm("purpleParent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([parentPermanentId]);
    const secondSecurityChecks = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: parentPermanentId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === secondSecurityChecks + 1 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.security.length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secondCost").instanceId,
      s.inst("thirdSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("recoveredCost").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("trashCandidate").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
    expect(s.perm("purpleParent").permanentId).toBe(parentPermanentId);
    expect(s.perm("purpleParent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly DNA digivolves for 0, recovers, places either controller's card, and trashes the opponent top", async () => {
    const run = async (controller: "mine" | "opponent", position: "top" | "bottom", acceptPlacement = true) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT10-079", as: "purpleMaterial" },
              { card: "BT1-057", as: "yellowMaterial" },
              ...(controller === "mine" ? [{ card: "BT1-045", as: "placedOwn" }] : []),
            ],
            hand: [{ card: "P-187", as: "mastemon" }],
            security: [{ card: "BT1-048", as: "ownTop" }],
            deck: [
              { card: "BT1-010", as: "dnaDraw" },
              { card: "BT1-009", as: "recovery" },
              ...Array(18).fill("BT1-010"),
            ],
          },
          1: {
            battleArea: controller === "opponent" ? [{ card: "BT1-089", as: "placedOpponent" }] : [],
            security: [
              { card: "BT1-067", as: "opponentTop" },
              { card: "BT1-068", as: "opponentBottom" },
            ],
            deck: Array(20).fill("BT1-011"),
          },
        },
        {
          ...(acceptPlacement ? { autoAcceptOptional: true } : { autoDeclineOptional: true }),
          autoSelectCards: true,
          autoChooseOption: true,
          preferOptionIndex: position === "top" ? 0 : 1,
          preferInstanceIds: preferred,
        },
      );
      preferred.push(s.inst(controller === "mine" ? "placedOwn" : "placedOpponent").instanceId);
      const purpleId = s.perm("purpleMaterial").permanentId;
      const purpleSourceId = s.inst("purpleMaterial").instanceId;
      const yellowPermanentId = s.perm("yellowMaterial").permanentId;
      const yellowSourceId = s.inst("yellowMaterial").instanceId;
      const mastemonId = s.inst("mastemon").instanceId;
      const placedPermanentId = s.perm(controller === "mine" ? "placedOwn" : "placedOpponent").permanentId;
      s.state.memory = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [purpleId, yellowPermanentId],
          instanceId: mastemonId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === mastemonId) &&
          s.state.pendingDecision === undefined,
      );
      const merged = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === mastemonId)!;
      expect(s.state.memory).toBe(0);
      expect(merged.stack).toHaveLength(2);
      expect(merged.stack.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([purpleSourceId, yellowSourceId]),
      );
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(purpleId);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(yellowPermanentId);
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dnaDraw").instanceId);
      expect(s.state.players[0]!.deck).toHaveLength(18);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).includes(s.inst("opponentTop").instanceId)).toBe(
        acceptPlacement,
      );
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);

      const placedInstanceId = s.inst(controller === "mine" ? "placedOwn" : "placedOpponent").instanceId;
      const ownerSecurity = controller === "mine" ? s.state.players[0]!.security : s.state.players[1]!.security;
      const placedSecurityIndex = position === "top" ? 0 : ownerSecurity.length - 1;
      expect(ownerSecurity[placedSecurityIndex]?.instanceId === placedInstanceId).toBe(acceptPlacement);
      expect(ownerSecurity).toHaveLength(controller === "mine" ? 3 : 2);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(placedPermanentId);
      expect(s.state.players[1]!.security).toHaveLength(controller === "mine" ? 1 : 2);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).includes(s.inst("opponentTop").instanceId)).toBe(
        acceptPlacement,
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(acceptPlacement ? 0 : 1);
      expect(
        s.state.players.some((player) =>
          player.battleArea.some((permanent) => permanent.permanentId === placedPermanentId),
        ),
      ).toBe(!acceptPlacement);
    };

    await run("mine", "top");
    await run("opponent", "bottom");
    await run("opponent", "bottom", false);
  });
});
