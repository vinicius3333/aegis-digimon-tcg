import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_077 } from "./BT24-077.js";
import "../index.js";

describe("BT24-077 Revivemon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-077")).toMatchObject({
      cardId: "BT24-077",
      nameEn: "Revivemon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 9,
      dp: 9000,
      forms: ["Ult.", "Appmon"],
      attributes: ["System"],
      types: ["Restoration"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("links level 4 or lower cards from trash/stack and revives an Appmon on deletion", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      const action = BT24_077.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        recipient: { filter: { controller: "mine", kind: ["Digimon"] } },
        payCost: false,
      });
      expect(action?.target?.filter).toMatchObject({
        levelComparison: { op: "lte", value: 4 },
        hostFilter: { isSelfRef: true },
      });
    }
    const revival = BT24_077.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(
      BT24_077.effects?.find(
        (entry) => entry.trigger === "OnDeletion" && entry.actions?.[0]?.kind === "PlayWithoutCost",
      )?.actions?.[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: {
        filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });
    expect(revival?.kind).toBe("Link");
  });

  it("implements its cost-3 Appmon link and linked lowest-DP deletion", () => {
    expect(BT24_077.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(BT24_077.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenLinking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        },
      ],
    });
  });

  it("public play pays 9 and enters with Blocker", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT24-077", as: "revivemon" }] } });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revivemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("revivemon"), "Blocker"));

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("revivemon"), "Blocker")).toBe(true);
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070"],
    ["normal red level-4 requirement", "BT1-014"],
  ])("uses the %s for cost 4 and resolves its free link", async (_label, baseCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [{ card: "BT24-077", as: "revivemon" }],
          trash: [{ card: "BT24-036", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("link").instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("revivemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("revivemon").instanceId);
  });

  it("App Fuses from Raidramon linked with Dezipmon for cost 0", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: "BT24-071", as: "raidramon" },
          ],
          hand: [{ card: "BT24-056", as: "dezipmon" }],
          trash: [{ card: "BT24-077", as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("raidramon").topCard.instanceId, s.inst("fusion").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dezipmon").instanceId,
        targetPermanentId: s.perm("raidramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("raidramon").topCard.instanceId === s.inst("fusion").instanceId);
    await settle(() => observe(s.engine).hasKeyword(s.perm("raidramon"), "Blocker"));

    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(s.perm("raidramon"), "Blocker")).toBe(true);
  });

  it("free-links an eligible level 4 from trash to a chosen friendly Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-077", as: "revivemon" },
            { card: "BT21-009", as: "recipient" },
          ],
          trash: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT24-036", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("noLink").instanceId, s.inst("eligible").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("revivemon"));
    await settle(() => s.perm("recipient").linked.some((card) => card.instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("only free-links from Revivemon's own digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-077", as: "revivemon", under: [{ card: "BT24-036", as: "ownSource" }] },
            { card: "BT21-009", as: "recipient" },
            { card: "BT24-038", as: "other", under: [{ card: "BT24-036", as: "otherSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("recipient").topCard.instanceId,
      s.inst("otherSource").instanceId,
      s.inst("ownSource").instanceId,
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("revivemon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("ownSource").instanceId),
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.linked.some((card) => card.instanceId === s.inst("ownSource").instanceId),
      ),
    ).toBe(true);
  });

  it("public deletion links one eligible card and plays a level 3 Appmon from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-077", as: "revivemon" },
            { card: "BT21-009", as: "recipient" },
          ],
          trash: [
            { card: "BT24-036", as: "link" },
            { card: "BT24-032", as: "appmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("link").instanceId, s.inst("appmon").instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("revivemon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );

    expect(s.perm("recipient").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
  });

  it("links for cost 3, adds 4000 DP, and deletes one Digimon tied for lowest DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-077", as: "revivemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA", dp: 2000 },
            { card: "BT1-010", as: "lowB", dp: 2000 },
            { card: "BT1-011", as: "high", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lowA").topCard.instanceId);
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    s.state.memory = 5;
    await s.ready();
    const hostDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("revivemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("revivemon").instanceId));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowAId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(hostDp + 4000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(lowBId);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
