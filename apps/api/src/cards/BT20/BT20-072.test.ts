import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-072.js";
import "./BT20-068.js";
import "./BT20-073.js";
import "./BT20-078.js";
import "./index.js";

describe("BT20-072 Phantomon", () => {
  it("has Execute", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Execute" }],
    });
  });

  it("may play one own level 4 or lower Ghost Digimon from trash without paying on deletion", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "OnDeletion")) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
              },
              count: 1,
            },
          },
        ],
      });
    }
    expect(compiled.effects.filter((effect) => effect.trigger === "OnDeletion")).toHaveLength(2);
  });

  it("publishes stats, evolution, and live Execute", async () => {
    expect(getCardDefinition("BT20-072")).toMatchObject({
      cardId: "BT20-072",
      nameEn: "Phantomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
      effectText: expect.stringContaining("＜Execute＞"),
      inheritedEffectText: expect.stringContaining("[On Deletion] You may play 1 level 4 or lower"),
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-072", as: "phantomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phantomon"), "Execute")).toBe(true);
  });

  it("executes its end-of-turn attack and then reaches the printed self-deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-072", as: "phantomon" }], deck: ["BT20-047", "BT20-047"] },
        1: { security: ["BT20-047"], deck: ["BT20-047", "BT20-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("phantomon").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-072")).toBe(false);
  });

  it("main and inherited On Deletion each free-play an eligible level-4 Ghost from trash", async () => {
    for (const inherited of [false, true]) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "BT20-076", under: ["BT20-072"], as: "subject", suspended: true }
                : { card: "BT20-072", as: "subject", suspended: true },
            ],
            trash: [
              { card: "BT20-068", as: "eligible" },
              { card: "BT20-072", as: "level5" },
              { card: "BT20-047", as: "nonGhost" },
            ],
            deck: ["BT20-047", "BT20-047"],
          },
          1: {
            battleArea: [{ card: "BT20-069", dp: 15000, as: "attacker" }],
            deck: ["BT20-047", "BT20-047"],
            security: ["BT20-047", "BT20-047"],
          },
        },
        { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("eligible").instanceId);
      const subjectPermanentId = s.perm("subject").permanentId;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: subjectPermanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").isSuspended);
      advance(s.engine).endMainPhaseIfOpen(0);
      const refusalResult = inherited
        ? undefined
        : await (async () => {
            await settle(() => s.state.pendingDecision?.kind === "optional");
            return s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: s.state.pendingDecision!.decisionId,
              response: { kind: "optional", accept: false },
            });
          })();
      expect(refusalResult).toEqual(inherited ? undefined : { ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: subjectPermanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-068"));
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-068"]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("level5").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonGhost").instanceId);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("allows the On Deletion replay to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-072", as: "phantomon", suspended: true }],
          trash: [{ card: "BT20-068", as: "eligible" }],
          deck: ["BT20-047", "BT20-047"],
        },
        1: {
          battleArea: [{ card: "BT20-069", dp: 15000, as: "attacker" }],
          deck: ["BT20-047", "BT20-047"],
          security: ["BT20-047", "BT20-047"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const subjectPermanentId = s.perm("phantomon").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: subjectPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("phantomon").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: subjectPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("phantomon").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
