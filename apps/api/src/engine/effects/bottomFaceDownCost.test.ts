import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "./collect.js";
import { describe, expect, it } from "vitest";
import { observe } from "../testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("bottom face-down cost boundary (Q4785)", () => {
  it("uses the first face-down Tamer card from the bottom and completes BT25-027 combat", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "mach" },
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "faceUpBottom", faceUp: true },
                { card: "BT1-002", as: "firstFaceDown", faceUp: false },
                { card: "BT1-003", as: "higherFaceDown", faceUp: false },
              ],
            },
          ],
        },
        1: { security: [{ card: "BT1-004", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("firstFaceDown").instanceId }),
    );
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("faceUpBottom").instanceId,
      s.inst("higherFaceDown").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("security").instanceId }),
    );
    expect(s.perm("mach").isSuspended).toBe(false);
  });

  it("matches the same Q4785 boundary through EX9-031's generic digivolution-card cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-031",
              as: "etemon",
              under: [
                { card: "BT1-051", as: "faceUpBottom", faceUp: true },
                { card: "BT1-002", as: "firstFaceDown", faceUp: false },
                { card: "BT1-003", as: "higherFaceDown", faceUp: false },
              ],
            },
          ],
          deck: ["BT1-004", "BT1-005"],
        },
        1: { security: ["BT1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("etemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("firstFaceDown").instanceId }),
    );
    expect(s.perm("etemon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("faceUpBottom").instanceId,
      s.inst("higherFaceDown").instanceId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-004"]);
  });

  it("leaves the source suspended when every card under the Tamer is face-up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "mach" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-001", as: "faceUp", faceUp: true }] },
          ],
        },
        1: { security: ["BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.perm("mach").isSuspended).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("faceUp").instanceId }),
    );
  });

  it("does not use a wrong-controller Tamer or a face-down card under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "mach" },
            { card: "BT1-016", as: "wrongHost", under: [{ card: "BT1-001", as: "wrongHostCard", faceUp: false }] },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-085",
              as: "opponentTamer",
              under: [{ card: "BT1-002", as: "wrongControllerCard", faceUp: false }],
            },
            {
              card: "BT1-043",
              as: "opponentDigimon",
              under: [{ card: "BT1-003", as: "opponentDigimonCard", faceUp: false }],
            },
          ],
          security: ["BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.perm("mach").isSuspended).toBe(true);
    expect(s.perm("wrongHost").stack.map((card) => card.instanceId)).toContain(s.inst("wrongHostCard").instanceId);
    expect(s.perm("opponentTamer").stack.map((card) => card.instanceId)).toContain(
      s.inst("wrongControllerCard").instanceId,
    );
    expect(s.perm("opponentDigimon").stack.map((card) => card.instanceId)).toContain(
      s.inst("opponentDigimonCard").instanceId,
    );
  });

  it("covers the named UnderDigimon path with the same boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-048",
              as: "bloomLordmon",
              under: [
                { card: "BT1-078", as: "faceUpBottom", faceUp: true },
                { card: "BT1-010", as: "faceDownUpper", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "EX9-008", as: "ver4" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bloomLordmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toContain("EX9-008");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("faceDownUpper").instanceId);
    expect(s.perm("bloomLordmon").stack.map((card) => card.instanceId)).toEqual([s.inst("faceUpBottom").instanceId]);
  });
  it("preflights an Option paid from above a face-up Tamer bottom before using it from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-070", as: "nightchirop" },
            {
              card: "BT1-085",
              as: "firstTamer",
              under: [
                { card: "BT1-001", as: "firstFaceUp", faceUp: true },
                { card: "P-236", as: "optionCost", faceUp: false },
              ],
            },
            {
              card: "BT1-085",
              as: "secondTamer",
              under: [
                { card: "BT1-002", as: "secondFaceUp", faceUp: true },
                { card: "BT1-003", as: "otherCost", faceUp: false },
              ],
            },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const optionCostId = s.inst("optionCost").instanceId;
    s.state.memory = 2;
    await s.ready();
    const source = observe(s.engine).cardSource(s.inst("nightchirop"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT26-070/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("nightchirop").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionCostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionCostId)).toBe(true);
    expect(s.perm("firstTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("firstFaceUp").instanceId]);
    expect(s.perm("secondTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("secondFaceUp").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("otherCost").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
