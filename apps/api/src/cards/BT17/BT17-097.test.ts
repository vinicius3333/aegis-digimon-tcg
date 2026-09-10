import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-097.js";
import "../BT8/BT8-097.js";
import "../EX3/EX3-063.js";
import "./index.js";
import "../BT16/BT16-025.js";

describe("BT17-097 Return to the Primogenitor", () => {
  it("keeps the Main digivolution requirement and places the Option afterward", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 4,
          optional: true,
          into: {
            kind: ["Digimon"],
            levelComparison: { op: "gte", value: 5 },
            nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses the intrinsic Delay replacement only for another effect's deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "otherThanYourEffect" }],
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          bindResultAs: "digivolvedToPreventDeletion",
          target: {
            filter: {
              useTriggerSource: true,
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
            },
          },
          into: { nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }] },
        },
        { kind: "Prevent", condition: { kind: "bindingExists", ref: "digivolvedToPreventDeletion" } },
      ],
    });
  });

  it("keeps the Security Tamer recovery path scoped to Davis or Ken", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          optional: true,
          target: {
            filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Davis Motomiya", "Ken Ichijoji"], match: "name" }] },
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("places itself after the optional Main evolution is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-019", "BT17-030"], hand: [{ card: "BT17-097", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("naturally evolves one legal level 5 or higher Free Digimon for four less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "base" },
            { card: "BT17-019", as: "colorSource" },
            { card: "BT17-036", as: "greenColorSource" },
          ],
          hand: [
            { card: "BT17-097", as: "option" },
            { card: "BT3-017", as: "valkyrimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT3-017");

    expect(s.perm("base").topCard?.cardId).toBe("BT3-017");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097")).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("valkyrimon").instanceId)).toBe(false);
  });

  it("naturally digivolves the Free Digimon being deleted by an opponent effect and prevents deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-028", as: "freeTarget" }],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: {
          hand: [{ card: "BT17-017", as: "opponentEffect" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, Zone.Hand, { card: "BT12-030", as: "imperialdramon" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("freeTarget").topCard?.cardId === "BT12-030");

    // The prevention prompt is player-facing: it must ask a plain-language question and carry
    // the card's printed clause as provenance, never the internal replacement event name
    // (this card's compiled Replacement stores "wouldBeDeleted" in its `raw`).
    const preventPrompt = s.decisions.find(
      (decision) => decision.req.kind === "optional" && decision.req.promptText === "Prevent leaving the battle area?",
    );
    expect(preventPrompt).toBeDefined();
    expect(preventPrompt!.req.sourceCardId).toBe("BT17-097");
    expect(preventPrompt!.req.options?.effectText).toContain("prevent that deletion");
    for (const decision of s.decisions) {
      expect(decision.req.promptText ?? "").not.toMatch(/would[A-Z]/);
      expect(decision.req.options?.effectText ?? "").not.toMatch(/would[A-Z]/);
    }

    expect(s.perm("freeTarget").topCard?.cardId).toBe("BT12-030");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("imperialdramon").instanceId)).toBe(
      false,
    );
  });

  it("refuses the Main digivolution into a Free target whose requirement the base cannot meet (Q2885)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "redBase" },
            { card: "BT17-019", as: "blueSource" },
            { card: "BT17-036", as: "greenSource" },
          ],
          hand: [
            { card: "BT17-097", as: "option" },
            { card: "BT12-028", as: "blueGreenFree" },
            { card: "BT17-019", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.perm("redBase").topCard?.cardId).toBe("BT3-014");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueGreenFree").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097")).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("takes the Free target and leaves a legal same-level non-Free card untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "redBase" },
            { card: "BT17-019", as: "blueSource" },
            { card: "BT17-036", as: "greenSource" },
          ],
          hand: [
            { card: "BT17-097", as: "option" },
            { card: "BT3-017", as: "freeMega" },
            { card: "BT3-016", as: "nonFreeMega" },
            { card: "BT17-019", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("redBase").topCard?.cardId === "BT3-017");

    expect(s.perm("redBase").topCard?.cardId).toBe("BT3-017");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonFreeMega").instanceId)).toBe(true);
  });

  it("cannot prevent deletion when the deleted Free Digimon fails the Imperialdramon requirement (Q2886)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "redFree" },
            { card: "BT17-019", as: "blueSource", dp: 20_000 },
            { card: "BT17-036", as: "greenSource", dp: 20_000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, Zone.Hand, { card: "BT12-030", as: "imperialdramon" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-014"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT3-014")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT3-014")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("imperialdramon").instanceId)).toBe(true);
  });

  it("saves only 1 of 2 Free Digimon deleted at the same time by an opponent effect (Q2890)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-028", as: "freeA", dp: 5000 },
            { card: "BT12-028", as: "freeB", dp: 5000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource", dp: 20_000 }],
          hand: [{ card: "BT8-097", as: "massDeletion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, Zone.Hand, { card: "BT12-030", as: "imperialdramon" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("massDeletion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT12-028"));
    // 1 digivolution saves exactly 1 Digimon; the other Free Digimon is still deleted.
    const survivors = s.state.players[0]!.battleArea.filter(
      (permanent) => permanent.topCard?.cardId === "BT12-030" || permanent.topCard?.cardId === "BT12-028",
    );
    expect(survivors).toHaveLength(1);
    expect(survivors[0]!.topCard?.cardId).toBe("BT12-030");
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT12-028")).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("imperialdramon").instanceId)).toBe(
      false,
    );
  });

  it("cannot attack with the Digimon saved on the opponent's turn (Q2891)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "redFree" },
            { card: "BT17-019", as: "blueSource", dp: 20_000 },
            { card: "BT17-036", as: "greenSource", dp: 20_000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, Zone.Hand, { card: "EX3-063", as: "dragonMode" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("redFree").topCard?.cardId === "EX3-063");

    expect(s.perm("redFree").topCard?.cardId).toBe("EX3-063");
    // Only the turn player may attack, so the saved Digimon cannot attack on the opponent's turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("redFree").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("naturally plays a Davis or Ken card from Security, then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-097", as: "securityOption" }],
          hand: [{ card: "BT12-090", as: "davis" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-090"),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-090")).toBe(true);
  });

  it("Q2887: digivolving with the Delay negates the deleted Paildramon's printed Partition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-025", as: "paildramon", under: ["BT2-024", "BT10-047"] },
            { card: "BT17-019", as: "blueSource", dp: 20_000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, Zone.Hand, { card: "BT12-030", as: "imperialdramon" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("paildramon").topCard?.cardId === "BT12-030");

    // The Delay digivolve prevented the deletion, so ＜Partition＞ is negated: both specified
    // digivolution cards stay in the stack and neither is played to the battle area.
    expect(s.perm("paildramon").stack.map((card) => card.cardId)).toEqual(["BT2-024", "BT10-047", "BT16-025"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT12-030",
      "BT17-019",
    ]);
    // The Option itself is the ＜Delay＞ cost, so it moves from the battle area to the trash.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT17-097"]);
  });

  it("Q2888: without the Delay digivolve, the deleted Paildramon's Partition plays its specified cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-025", as: "paildramon", under: ["BT2-024", "BT10-047"] },
            { card: "BT17-019", as: "blueSource", dp: 20_000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT16-025"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT16-025");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT10-047",
      "BT17-019",
      "BT17-097",
      "BT2-024",
    ]);
  });

  // Q2889: ＜Partition＞ granted by a digivolution card carries its specifier on THAT card, not on
  // the top card. `partitionCandidates` now falls back to the stack when the top card prints no
  // marker, and `partitionSpecOf` reads the inherited copy of the text as well as the printed one.
  // See docs/audits/BT17.md#inherited-partition-specifier-mechanism.
  it("Q2889: Partition from a BT16-025 in the digivolution cards still plays its cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-030", as: "imperial", under: ["BT2-024", "BT10-047", "BT16-025"] },
            { card: "BT17-019", as: "blueSource", dp: 20_000 },
          ],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT12-030"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT10-047",
      "BT17-019",
      "BT17-097",
      "BT2-024",
    ]);
  });
});
