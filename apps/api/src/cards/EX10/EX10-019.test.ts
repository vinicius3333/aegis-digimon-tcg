import { describe, expect, it } from "vitest";
import { appFusionCostFor, EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-019.js";
import "../index.js";

const CARD_ID = "EX10-019";

describe("EX10-019 Warudamon", () => {
  it("records the exact catalog, App Fusion, Fortitude, Link, and scoped watchers", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["System"],
      types: ["Strategy", "Leviathan"],
      linkDp: 4000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mienumon", "Sakusimon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fortitude" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Link",
            from: ["trash", "digivolutionCards"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                hasLinkRequirement: true,
                or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
              },
            },
            recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && effect.frequency)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "SelectBind", optional: true, abortOnDecline: true },
            { kind: "Suspend", target: { fromSelectionRef: "warudamonTarget" } },
            {
              kind: "Restrict",
              restriction: "unsuspend",
              duration: "untilOpponentNextUnsuspendPhase",
              target: { fromSelectionRef: "warudamonTarget" },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && effect.isLinked)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              cost: { target: { filter: { zone: "linked", isSelfRef: true }, count: 1 } },
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["green", "BT1-071"],
    ["purple", "BT10-074"],
  ])("uses the normal %s level-4 route for exactly 4", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: CARD_ID, as: "warudamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Fortitude")).toBe(true);
  });

  it("performs the exact zero-cost App Fusion pair with a realistic stack", async () => {
    expect(appFusionCostFor(CARD_ID, { topName: "Mienumon", linkedNames: ["Sakusimon"] })).toBe(0);
    expect(appFusionCostFor(CARD_ID, { topName: "Sakusimon", linkedNames: ["Mienumon"] })).toBe(0);
    expect(appFusionCostFor(CARD_ID, { topName: "Mienumon", linkedNames: ["Mienumon"] })).toBeUndefined();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-017", as: "fuser", linked: [{ card: "EX10-043", as: "sakusimon" }] }],
          hand: [{ card: CARD_ID, as: "warudamon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    const result = await advance(s.engine).verb.appFuseInto(
      s.perm("fuser").permanentId,
      s.inst("warudamon").instanceId,
    );
    expect(result?.topCard.cardId).toBe(CARD_ID);
    expect(result?.stack.map(({ cardId }) => cardId)).toContain("EX10-017");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("Q5053 links only a level-4-or-lower card with Link from trash to itself for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "warudamon" }],
          trash: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT24-053", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("eligible").instanceId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("warudamon").linked.length === 1);
    expect(s.perm("warudamon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("When Digivolving links only from this Digimon's own sources", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "warudamon", under: [{ card: "BT24-053", as: "ownSource" }] },
            { card: "BT21-009", as: "neighbor", under: [{ card: "BT24-053", as: "otherSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("otherSource").instanceId, s.inst("ownSource").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("warudamon"));
    expect(s.perm("warudamon").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("ownSource").instanceId);
    expect(s.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("otherSource").instanceId);
  });

  it("Q5054-Q5056 restricts an unsuspendable chosen target and spends the OPT", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "warudamon" }], hand: [{ card: "BT24-053", as: "link" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "protected" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beSuspended",
      EffectDuration.Permanent,
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "unsuspend"));
    expect(s.perm("protected").isSuspended).toBe(false);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("warudamon").permanentId,
    });
    expect(s.perm("second").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(false);
  });

  it("Q5055 may refuse without suspending or applying the restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "warudamon" }], hand: [{ card: "BT24-053", as: "link" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warudamon").linked.length === 1);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });

  it("links only to Appmon for exactly 3 and contributes +4000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "notAppmon" },
        ],
        hand: [{ card: CARD_ID, as: "warudamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warudamon").instanceId,
        targetPermanentId: s.perm("notAppmon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warudamon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 4000);
  });

  it("Q5051 trashes itself as the linked cost and exactly 1 opposing security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "warudamon" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("warudamon").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q5052 can trash another same-host link, and refusal preserves security", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: CARD_ID, as: "warudamon" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("otherLink").instanceId);
    advance(accepted.engine).ledgers.continuous.addLinkMaxGrant(
      accepted.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    await accepted.ready();
    await advance(accepted.engine).verb.suspend([accepted.perm("opponent").permanentId], 0);
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("warudamon").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.state.players[1]!.security).toHaveLength(1);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "warudamon" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).verb.suspend([declined.perm("opponent").permanentId], 0);
    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.state.players[1]!.security).toHaveLength(2);
  });

  it("replays through Fortitude only when deleted with a digivolution card", async () => {
    const withSource = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "warudamon", under: [{ card: "BT1-071", as: "source" }] }] } },
      { autoDeclineOptional: true },
    );
    await withSource.ready();
    const warudamonId = withSource.inst("warudamon").instanceId;
    expect(
      await advance(withSource.engine).verb.deletePermanent([withSource.perm("warudamon").permanentId], "byEffect"),
    ).toBe(1);
    await settle(() =>
      withSource.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === warudamonId),
    );
    expect(withSource.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      withSource.inst("source").instanceId,
    );

    const withoutSource = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "warudamon" }] } });
    expect(
      await advance(withoutSource.engine).verb.deletePermanent(
        [withoutSource.perm("warudamon").permanentId],
        "byEffect",
      ),
    ).toBe(1);
    expect(withoutSource.state.players[0]!.battleArea).toHaveLength(0);
    expect(withoutSource.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });
});
