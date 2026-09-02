import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
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

  it("records no link-box effect beyond the printed lower-box replacement", () => {
    // Guards the removed fabrication: Cometmon has no printed "[When Attacking] trash a link
    // card to return an [Appmon] Digimon card from your trash" clause anywhere in the catalog.
    expect(compiled.effects?.some((effect) => effect.isLinked === true)).toBe(false);
    expect(compiled.effects?.flatMap((effect) => effect.actions ?? []).some((action) => action.kind === "Return")).toBe(
      false,
    );
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

  it("the replacement is spent after one use per turn even with a link card still available", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              under: [{ card: CARD_ID, as: "comet" }],
              linked: [
                { card: "BT26-010", as: "first" },
                { card: "BT24-036", as: "second" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(
      s.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("first").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
  });

  it("the leave replacement reaches its host from the digivolution stack AND from the link zone", async () => {
    // The catalog stores this clause in `inheritedEffectText` (so the record is `isInherited`),
    // while KB Q5086/Q5089 call it a LINK effect. Empirically the distinction is behaviourally
    // moot for this clause: the engine collects the effect in both residencies. This case pins
    // both, so neither classification can silently lose a working residency.
    const inStack = setupEngine(
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
    await inStack.ready();
    expect(await advance(inStack.engine).verb.deletePermanent([inStack.perm("host").permanentId], "byEffect")).toBe(0);
    expect(inStack.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      inStack.inst("link").instanceId,
    );

    // Q5086: as a LINK card, Cometmon may pay the cost with itself — it is the host's only link.
    const asLinkCard = setupEngine(
      { 0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "comet" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await asLinkCard.ready();
    const linkedHostId = asLinkCard.perm("host").permanentId;
    expect(await advance(asLinkCard.engine).verb.deletePermanent([linkedHostId], "byEffect")).toBe(0);
    expect(asLinkCard.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(linkedHostId);
    expect(asLinkCard.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      asLinkCard.inst("comet").instanceId,
    );
  });

  it("Q5089 pays with another link card on the same host, never a neighbour's link", async () => {
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
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(
      s.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    preferred.push(s.inst("sameHost").instanceId);
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sameHost").instanceId);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("comet").instanceId);
    expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("neighborLink").instanceId);
  });

  it("may decline the replacement, in which case the host leaves and no link is trashed", async () => {
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
      { autoDeclineOptional: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostId);
  });
  it("Q5088 a link card trashed by the over-limit replace rule does not fire the -8000 watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "comet",
              under: [{ card: "BT24-036", as: "newLink" }],
              linked: [{ card: "BT26-010", as: "existing" }],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("victim").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("comet"));
    await settle();
    expect(s.perm("comet").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("newLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("existing").instanceId);
    expect(s.perm("victim").currentDP).toBe(baseDp);
  });
});
