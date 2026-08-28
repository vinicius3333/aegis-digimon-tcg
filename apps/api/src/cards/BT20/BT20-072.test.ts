import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-072.js";
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
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-072", as: "phantomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phantomon"), "Execute")).toBe(true);
  });

  it("main and inherited On Deletion each free-play an eligible level-4 Ghost from trash", async () => {
    for (const inherited of [false, true]) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "BT20-073", under: ["BT20-072"], as: "subject" }
                : { card: "BT20-072", as: "subject" },
            ],
            trash: [
              { card: "BT20-068", as: "eligible" },
              { card: "BT20-072", as: "level5" },
              { card: "BT20-047", as: "nonGhost" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("eligible").instanceId);
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-068"]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("level5").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonGhost").instanceId);
    }
  });

  it("allows the On Deletion replay to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-072", as: "phantomon" }],
          trash: [{ card: "BT20-068", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("phantomon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
  });
});
