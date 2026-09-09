import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT16/BT16-012.js";
import "./BT17-078.js";
import { compiled } from "./BT17-007.js";

describe("BT17-007", () => {
  it("returns a Garurumon, Greymon, or Omnimon from trash with a Tai Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Return",
          to: "hand",
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Tai Kamiya"] }] },
          },
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Garurumon", "Greymon", "Omnimon"], match: "name" }],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("can DNA digivolve at end of turn as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          payCost: true,
          optional: true,
          materials: [
            { count: 1, zone: "battleArea", filter: { isSelfRef: true } },
            { count: 1, zone: "battleArea", filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true } },
          ],
          into: { controllerDefault: "mine", kind: ["Digimon"], hasDnaDigivolutionRequirement: true, zone: "hand" },
        },
      ],
    });
  });

  it("returns exactly one matching trash card during a natural main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-007", as: "host", under: ["BT17-001"] },
          { card: "BT1-085", as: "tai" },
        ],
        trash: [
          { card: "BT17-013", as: "warGrowlmon" },
          { card: "BT17-015", as: "warGreymon" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });

    await s.ready();
    await advance(s.engine).runTurn(0);

    const returnedIds = [s.inst("warGrowlmon").instanceId, s.inst("warGreymon").instanceId];
    expect(s.state.players[0]!.hand.filter((card) => returnedIds.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => returnedIds.includes(card.instanceId))).toHaveLength(1);
  });

  it("naturally DNA digivolves the legal red-and-yellow pair at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-010", as: "redLv4", under: ["BT17-001", "BT17-007"] },
            { card: "BT1-051", as: "yellowLv4", under: ["BT1-048"] },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-012"));

    const merged = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-012");
    expect(merged?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-010", "BT17-007", "BT1-051", "BT1-048"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-012")).toBe(false);
  });

  it("does not use the inherited effect for a hand Digimon without DNA Digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-010", as: "redLv4", under: ["BT17-001", "BT17-007"] },
            { card: "BT1-051", as: "yellowLv4", under: ["BT1-048"] },
          ],
          hand: [{ card: "BT17-078", as: "omnimon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("matches the catalog printed text, evolution costs and requirement", () => {
    expect(getCardDefinition("BT17-007")).toMatchObject({
      cardId: "BT17-007",
      nameEn: "Agumon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 0 },
        { color: "Blue", level: 2, memoryCost: 0 },
      ],
      inheritedEffectText:
        "[End of Your Turn] This Digimon and another of your Digimon may DNA digivolve into a Digimon card in the hand.",
    });
    const printed = getCardDefinition("BT17-007")!.effectText!;
    expect(printed).toContain("[Digivolve][Koromon]: Cost 0");
    expect(printed).toContain(
      "[Start of Your Main Phase] If you have a Tamer with [Tai Kamiya]\u00a0in its name, return 1 card with [Garurumon]/[Greymon]/[Omnimon]\u00a0in its name from your trash to the hand.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Koromon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("publicly digivolves from an off-color Koromon through the printed [Koromon] route for 0", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT12-003", as: "koromon" }, hand: [{ card: "BT17-007", as: "agumon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const koromonId = s.inst("koromon").instanceId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: agumonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === agumonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([koromonId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly digivolves from a red Lv2 egg through the normal route for 0", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "yokomon" }, hand: [{ card: "BT17-007", as: "agumon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const yokomonId = s.inst("yokomon").instanceId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yokomon").permanentId,
        instanceId: agumonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === agumonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([yokomonId]);
  });

  it("refuses an off-color Lv2 source that is not named Koromon", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-005", as: "kyaromon" }, hand: [{ card: "BT17-007", as: "agumon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const kyaromonId = s.inst("kyaromon").instanceId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyaromon").permanentId,
        instanceId: agumonId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyaromon").permanentId,
        instanceId: agumonId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(kyaromonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([agumonId]);
    expect(s.state.memory).toBe(3);
  });

  it("returns exactly the matching trash card and leaves the non-matching one behind", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-007", as: "host", under: ["BT17-001"] },
          { card: "BT1-085", as: "tai" },
        ],
        trash: [
          { card: "BT17-013", as: "warGrowlmon" },
          { card: "BT17-015", as: "warGreymon" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("warGreymon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("warGrowlmon").instanceId]);
  });

  it("returns only 1 card even with 2 Tamers named Tai Kamiya, per Q2706", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-007", as: "host", under: ["BT17-001"] },
            { card: "BT1-085", as: "taiOne" },
            { card: "ST1-12", as: "taiTwo" },
          ],
          trash: [
            { card: "BT17-015", as: "warGreymon" },
            { card: "BT17-078", as: "omnimon" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);

    const trashCandidates = [s.inst("warGreymon").instanceId, s.inst("omnimon").instanceId];
    expect(s.state.players[0]!.hand.filter((card) => trashCandidates.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => trashCandidates.includes(card.instanceId))).toHaveLength(1);
  });

  it("returns nothing without a Tamer named Tai Kamiya", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-007", as: "host", under: ["BT17-001"] }],
        trash: [{ card: "BT17-015", as: "warGreymon" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("warGreymon").instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warGreymon").instanceId)).toBe(false);
  });

  it("returns nothing when the trash holds no matching name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-007", as: "host", under: ["BT17-001"] },
          { card: "BT1-085", as: "tai" },
        ],
        trash: [{ card: "BT17-013", as: "warGrowlmon" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("warGrowlmon").instanceId]);
  });

  it("resolves the inherited DNA digivolve while the turn is still yours, per Q2707", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-010", as: "redLv4", under: ["BT17-001", "BT17-007"] },
            { card: "BT1-051", as: "yellowLv4", under: ["BT1-048"] },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    const turn = advance(s.engine).runTurn(0);
    let seatAtMerge = -1;
    await settle(() => {
      const merged = s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-012");
      if (merged && seatAtMerge < 0) seatAtMerge = s.state.turnSeat;
      return merged;
    });
    await turn;

    expect(seatAtMerge).toBe(0);
  });

  it("refuses a DNA digivolve whose specified materials are not the pair in play, per Q2708 and Q2709", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-010", as: "redLv4", under: ["BT17-001", "BT17-007"] },
            { card: "BT1-014", as: "otherRedLv4", under: ["BT17-001"] },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("silphymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT17-010", "BT1-014"].sort(),
    );
  });

  it("counts a Tamer with [Tai Kamiya] inside a longer name but not a different Tamer", async () => {
    // Comparative peer: BT17-081 is "Tai Kamiya & Matt Ishida", so the printed substring
    // gate ("with [Tai Kamiya] in its name") must accept it, while the near-miss peer
    // BT1-086 "Matt Ishida" sits on the same board and must not enable anything.
    // BT17-081 raises optional prompts of its own once the whole BT17 set is registered in the
    // worker; decline them so this flow is deterministic regardless of registration order.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-007", as: "host", under: ["BT17-001"] },
            { card: "BT1-086", as: "matt" },
            { card: "BT17-081", as: "taiAndMatt" },
          ],
          trash: [{ card: "BT17-015", as: "warGreymon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("warGreymon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not fire for a near-miss Tamer peer that has no [Tai Kamiya] in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-007", as: "host", under: ["BT17-001"] },
          { card: "BT1-086", as: "matt" },
          { card: "BT1-087", as: "tk" },
        ],
        trash: [{ card: "BT17-015", as: "warGreymon" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("warGreymon").instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warGreymon").instanceId)).toBe(false);
  });
});
