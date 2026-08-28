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
          { card: "BT17-010", as: "host", under: ["BT17-001", "BT17-007"] },
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
});
