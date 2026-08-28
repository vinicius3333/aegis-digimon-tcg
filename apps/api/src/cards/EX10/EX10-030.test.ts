import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-030.js";
import "../index.js";

const CARD_ID = "EX10-030";

describe("EX10-030 Cometmon compiled contract", () => {
  it("records the exact catalog and compiled contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Yellow"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["Navi"],
      types: ["Astronomy", "Leviathan"],
      linkDp: 4000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Warpmon", "Weatherdramon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Link",
            from: ["hand", "digivolutionCards"],
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                hasLinkRequirement: true,
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      });
    }
  });

  it("links only a Link-capable level-4-or-lower card from its own stack to itself", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "comet", under: [{ card: "BT24-036", as: "valid" }] },
            { card: "BT21-009", as: "neighbor", under: [{ card: "BT24-036", as: "neighborValid" }] },
          ],
          hand: [{ card: "BT1-009", as: "noLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("neighborValid").instanceId, s.inst("noLink").instanceId, s.inst("valid").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("comet"));
    expect(s.perm("comet").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("valid").instanceId]);
    expect(s.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("neighborValid").instanceId);
  });

  it("Q5086/Q5089 pays with itself or another same-host link and returns an Appmon", async () => {
    for (const costAlias of ["comet", "sameHost"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT21-009",
                as: "host",
                linked: [
                  { card: CARD_ID, as: "comet" },
                  { card: "BT26-010", as: "sameHost" },
                ],
              },
              { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
            ],
            trash: [{ card: "EX10-029", as: "appmon" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst(costAlias).instanceId, s.inst("appmon").instanceId);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("appmon").instanceId));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst(costAlias).instanceId);
      expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toContain(
        s.inst("neighborLink").instanceId,
      );
    }
  });

  it("the link-trash watcher is scoped to this host and applies -8000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "comet", linked: [{ card: "BT26-010", as: "ownLink" }] },
            { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
          ],
        },
        1: { battleArea: [{ card: CARD_ID, as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    const baseDp = s.perm("target").currentDP;
    await advance(s.engine).verb.trash([s.inst("neighborLink").instanceId], 0);
    expect(s.perm("target").currentDP).toBe(baseDp);
    await advance(s.engine).verb.trash([s.inst("ownLink").instanceId], 0);
    expect(s.perm("target").currentDP).toBe(baseDp - 8000);
  });

  it("its inherited once-per-turn replacement trashes the host's link and prevents leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              under: [{ card: CARD_ID, as: "comet" }],
              linked: [{ card: "BT26-010", as: "link" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("link").instanceId);
  });
});
