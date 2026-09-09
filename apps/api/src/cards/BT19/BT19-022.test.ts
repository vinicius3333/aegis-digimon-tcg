import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-022.js";

// BT19-022 MailBirdramon — Blue/Black Lv.4 Champion, 5000 DP, play cost 5,
// digivolves from a Blue Lv.3 or a Black Lv.3 for 3.
//   ＜Blocker＞
//   [On Deletion] You may place 1 Digimon card with the [Blue Flare] trait from your trash
//   under any of your Tamers. Then, ＜Save＞.
//   Inherited: ＜Blocker＞.
//
// The KB has no ruling for this card (`node tools/kb/query.mjs card BT19-022` →
// "no knowledge-base entries"), so the audit rests on the printed text plus the general
// ＜Save＞ / placement rules (comprehensive 16-20-3 and 4-3-2).
//
// Fixtures: BT1-028 Elecmon (inert Blue Lv.3) and BT2-052 Hagurumon (inert Black Lv.3) are
// the legal digivolution sources, BT1-064 Goblimon (inert Green Lv.3) the illegal one.
// Trash near-misses for "1 Digimon card with the [Blue Flare] trait": BT19-081
// Kiriha Aonuma carries the [Blue Flare] trait but is a TAMER, and BT19-009 Growlmon is a
// Digimon without the trait.
describe("BT19-022 MailBirdramon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-022")).toMatchObject({
      cardId: "BT19-022",
      nameEn: "MailBirdramon",
      colors: ["Blue", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine", "Blue Flare"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "＜Blocker＞.",
    });
    // The catalog once dropped the word "trait" here; corrected in the BT19 re-audit.
    expect(getCardDefinition("BT19-022")?.effectText).toBe(
      "＜Blocker＞ \n[On Deletion] You may place 1 Digimon card with the [Blue Flare] trait from your trash under any of your Tamers. Then, ＜Save＞.",
    );
  });

  it("compiles every printed clause", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      // "Then, ＜Save＞" is the keyword; it also puts both placements at the stack bottom.
      keywords: [{ keyword: "Save" }],
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          target: {
            count: 1,
            from: ["trash"],
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              // "with the [X] trait" is an EXACT trait test, never a substring.
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
            },
          },
          underFilter: { controller: "mine", kind: ["Tamer"] },
        },
        {
          kind: "PlaceUnder",
          optional: true,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Tamer"] },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects).toHaveLength(3);
  });

  // ---------------------------------------------------------------------------
  // Digivolution routes
  // ---------------------------------------------------------------------------

  it.each([
    ["Blue Lv.3", "BT1-028"],
    ["Black Lv.3", "BT2-052"],
  ])("digivolves from a %s source for 3 with the bonus draw", async (_label, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "BT19-022", as: "mail" }],
        deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mail").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("BT19-022");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(5000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Green Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "green" }],
        hand: [{ card: "BT19-022", as: "mail" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("mail").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("green").topCard?.cardId).toBe("BT1-064");
    expect(s.perm("green").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-022"]);
  });

  // ---------------------------------------------------------------------------
  // ＜Blocker＞, printed and inherited
  // ---------------------------------------------------------------------------

  it("actually blocks an opponent's player attack, while a plain peer may not", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-022", as: "mail", dp: 20_000 },
          { card: "BT1-028", as: "plainPeer", dp: 20_000 },
        ],
        security: ["BT1-009", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mail"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainPeer"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    // The peer without ＜Blocker＞ is refused; MailBirdramon is not.
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("plainPeer").permanentId }).ok,
    ).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("mail").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    // Security is untouched and the 5000 DP attacker lost to the 20 000 DP blocker.
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT19-022",
      "BT1-028",
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited ＜Blocker＞ only to the host it sits under, which can really block", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-025", as: "host", dp: 20_000, under: ["BT19-022"] },
          { card: "BT19-025", as: "plainHost", dp: 20_000 },
        ],
        security: ["BT1-009", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("plainHost").permanentId }).ok,
    ).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ... Then, ＜Save＞
  // ---------------------------------------------------------------------------

  it("places the Blue Flare Digimon from trash and then Saves itself, both at the stack bottom", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-022", as: "mail" },
            { card: "BT19-081", as: "tamer", under: [{ card: "BT1-011", as: "older" }] },
          ],
          trash: [
            { card: "BT19-016", as: "blueFlare" },
            { card: "BT19-009", as: "nonMatching" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.inst("blueFlare").instanceId, s.perm("tamer").topCard!.instanceId);
    const mailInstanceId = s.inst("mail").instanceId;
    const blueFlareInstanceId = s.inst("blueFlare").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 3);
    await settle(() => false, 30);

    // Both placements go to the bottom, newest first (comprehensive 4-3-2).
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      mailInstanceId,
      blueFlareInstanceId,
      olderInstanceId,
    ]);
    // The non-matching Growlmon stays in the trash; MailBirdramon never reaches it.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores a [Blue Flare] Tamer and a non-[Blue Flare] Digimon in the trash, and still Saves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-022", as: "mail" },
            { card: "BT19-079", as: "tamer" },
          ],
          // BT19-081 Kiriha Aonuma HAS the [Blue Flare] trait but is a Tamer, not a Digimon
          // card; BT19-009 Growlmon is a Digimon without the trait.
          trash: [
            { card: "BT19-081", as: "blueFlareTamer" },
            { card: "BT19-009", as: "nonMatching" },
          ],
          // A [Blue Flare] Digimon in the HAND is out of the named zone.
          hand: [{ card: "BT19-016", as: "wrongZone" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const mailInstanceId = s.inst("mail").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([mailInstanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-081", "BT19-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-016"]);
  });

  it("declining both optionals leaves the trash card put and trashes MailBirdramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-022", as: "mail" },
            { card: "BT19-081", as: "tamer" },
          ],
          trash: [{ card: "BT19-016", as: "blueFlare" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const mailInstanceId = s.inst("mail").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === mailInstanceId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-016", "BT19-022"]);
  });

  it("does nothing when its controller has no Tamer to place under", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-022", as: "mail" }],
          trash: [{ card: "BT19-016", as: "blueFlare" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const mailInstanceId = s.inst("mail").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === mailInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-016", "BT19-022"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
