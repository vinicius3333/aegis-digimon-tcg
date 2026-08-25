import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-067.js";
import "../index.js";

const CARD_ID = "EX10-067";

describe("EX10-067 Ryoma Mogami", () => {
  it("records the exact catalog and complete cost/recipient contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Ryoma Mogami",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["Hunter"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Save"] },
          cost: {
            kind: "compound",
            costs: [
              { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              {
                kind: "place",
                target: {
                  filter: { controller: "mine", kind: ["Digimon"], zone: "underTamers", keywords: ["Save"] },
                  from: ["underTamers"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "triggerSource",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: { sourceRef: "triggerSubject" },
              keyword: { keyword: "Alliance" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
  });

  it("sets memory to 3 only from 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "ryoma" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fireForPermanent(EffectTiming.OnStartTurn, low.perm("ryoma"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "ryoma" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).fireForPermanent(EffectTiming.OnStartTurn, high.perm("ryoma"));
    expect(high.state.memory).toBe(4);
  });

  it("suspends itself, moves a saved Digimon to the event host's bottom, and grants that host Alliance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ryoma" },
            { card: "EX10-065", as: "bank", under: [{ card: "EX10-026", as: "saved" }] },
            { card: "EX10-027", as: "digivolved" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenOneOfYoursDigivolves").length).toBeGreaterThan(
      0,
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("digivolved").permanentId,
    });

    expect(s.perm("ryoma").isSuspended).toBe(true);
    expect(s.perm("bank").stack).toHaveLength(0);
    expect(s.perm("digivolved").stack[0]?.cardId).toBe("EX10-026");
    expect(observe(s.engine).hasKeyword(s.perm("digivolved"), "Alliance")).toBe(true);
  });

  it("pays none of the compound cost when no saved card exists under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ryoma" },
            { card: "EX10-027", as: "digivolved" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("digivolved").permanentId,
    });
    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("digivolved"), "Alliance")).toBe(false);
  });

  it("ignores a digivolution subject without Save in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ryoma" },
            { card: "EX10-065", as: "bank", under: ["EX10-027"] },
            { card: "BT1-009", as: "ordinary" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("ordinary").permanentId,
    });
    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(s.perm("bank").stack).toHaveLength(1);
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "ryoma" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("ryoma"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
