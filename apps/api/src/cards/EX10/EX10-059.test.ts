import { describe, expect, it } from "vitest";
import { getCardDefinition, Zone } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-059.js";
import "../index.js";

const CARD_ID = "EX10-059";

/**
 * EX10-059 DarknessBagramon, Lv.7 Purple/Black [Composite] [Bagra Army].
 *
 * Printed:
 *   [On Play] [When Digivolving] Choose 1 card in your opponent's hand without looking and
 *   place it as any of their Digimon's bottom digivolution card or under any of their Tamers.
 *   Then, by placing 3 [Bagra Army] trait Digimon cards from your trash as this Digimon's top
 *   digivolution cards, delete 1 of their Digimon or Tamers with cards under it.
 *   [All Turns] This Digimon gains all [All Turns] effects on all level 6 [Bagra Army] trait
 *   Digimon cards in its digivolution cards.
 *   [DigiXros -3] [Bagramon] x [DarkKnightmon]
 *
 * Every behavioural test below reaches the card through a public intent: a `playCard` with a
 * `digiXros` plan, or a `digivolve` onto a legally seeded Lv.6 purple source. Nothing is fired
 * through the injected-timing seam.
 */
describe("EX10-059 DarknessBagramon", () => {
  it("records the exact catalog and evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 7,
      playCost: 16,
      dp: 16000,
      evoCosts: [
        { color: "Purple", level: 6, memoryCost: 6 },
        { color: "Black", level: 6, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Composite", "Bagra Army"],
    });
  });

  it("has complete compiled coverage and the printed DigiXros recipe", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // `count` is the PER-MATERIAL cost reduction (see DigiXrosRequirement), so `[DigiXros -3]`
    // is `count: 3`. Two distinct named slots cap the play at two materials.
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [{ names: ["Bagramon"] }, { names: ["DarkKnightmon"] }],
        count: 3,
        costReduction: 3,
      },
    ]);
  });

  it("maps both printed windows to the same two-step action list", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toBeDefined();
      expect(effect!.actions).toMatchObject([
        {
          kind: "PlaceUnder",
          blind: true,
          target: { filter: { isOpponentHand: true, controller: "opponent", zone: "hand" }, count: 1, from: ["hand"] },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 3,
            from: ["trash"],
          },
          position: "top",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], hasDigivolutionCards: true } },
        },
      ]);
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "effects",
          copyTrigger: "AllTurns",
          filter: {
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          duration: "permanent",
        },
      ],
    });
  });

  // --- [DigiXros -3] [Bagramon] x [DarkKnightmon] ------------------------------------------

  /**
   * A DigiXros board with no opposing permanent and no [Bagra Army] card in the trash, so the
   * [On Play] resolves to nothing and the assertions read the DigiXros itself.
   */
  function xrosBoard(hand: { card: string; as: string }[]) {
    const s = setupEngine({ 0: { hand } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 16;
    return s;
  }

  it("DigiXroses from hand for 3 less per material and stacks both materials", async () => {
    const s = xrosBoard([
      { card: CARD_ID, as: "darkness" },
      { card: "BT11-088", as: "bagramon" },
      { card: "BT7-063", as: "darkknight" },
    ]);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagramon").instanceId, s.inst("darkknight").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));

    // 16 printed - 2 materials x 3 = 10 paid.
    expect(s.state.memory).toBe(6);
    // Loose hand materials are each placed at the bottom of the growing stack, so the last
    // declared material ends up beneath the first. Material order is the player's own choice
    // (§7-2-2-7), so only the membership is a rules fact.
    expect(s.perm("darkness").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bagramon").instanceId, s.inst("darkknight").instanceId]),
    );
    expect(s.perm("darkness").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision == null).toBe(true);
  });

  it("DigiXroses a battle-area Digimon as a material and removes it from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkness" },
            { card: "BT11-088", as: "bagramon" },
          ],
          battleArea: [{ card: "BT7-063", as: "darkknight" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;
    await s.ready();
    const fieldMaterialPermanentId = s.perm("darkknight").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("bagramon").instanceId, s.perm("darkknight").topCard!.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(
      fieldMaterialPermanentId,
    );
    expect(s.perm("darkness").stack.map(({ cardId }) => cardId)).toEqual(["BT11-088", "BT7-063"]);
  });

  it("refuses every material set the printed recipe does not name", async () => {
    const s = xrosBoard([
      { card: CARD_ID, as: "darkness" },
      { card: "BT11-088", as: "bagramon" },
      { card: "BT7-063", as: "darkknight" },
      { card: "EX10-056", as: "secondBagramon" },
      { card: "BT1-009", as: "stranger" },
    ]);
    s.give(0, Zone.Trash, { card: "BT19-063", as: "trashKnight" });
    await s.ready();

    const play = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds },
      });

    // A card that matches no printed slot.
    expect(play([s.inst("bagramon").instanceId, s.inst("stranger").instanceId])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    // Two [Bagramon]: the second cannot occupy the [DarkKnightmon] slot.
    expect(play([s.inst("bagramon").instanceId, s.inst("secondBagramon").instanceId])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    // Material cap: the recipe has exactly two slots, so a third material is illegal even when
    // it would match one of them by name.
    expect(
      play([s.inst("bagramon").instanceId, s.inst("darkknight").instanceId, s.inst("secondBagramon").instanceId]),
    ).toEqual({ ok: false, reason: "invalid-material" });
    // The trash is not a legal source for this card: it prints no trash allowance and no
    // expander Tamer is in play.
    expect(play([s.inst("bagramon").instanceId, s.inst("trashKnight").instanceId])).toEqual({
      ok: false,
      reason: "invalid-material",
    });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(16);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("buys with the reduction a memory total that cannot buy the printed cost", async () => {
    const s = xrosBoard([
      { card: CARD_ID, as: "darkness" },
      { card: "BT11-088", as: "bagramon" },
      { card: "BT7-063", as: "darkknight" },
    ]);
    // At 0 memory the gauge affords 10, so the printed 16 is out of reach and the reduced 10 is
    // exactly reachable — the discount is the whole difference between the two results.
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkness").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagramon").instanceId, s.inst("darkknight").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    expect(s.state.memory).toBe(-10);
  });

  it("refuses a DigiXros declaration with no materials at all", async () => {
    const s = xrosBoard([{ card: CARD_ID, as: "darkness" }]);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds: [] },
      }),
    ).toEqual({ ok: false, reason: "no-materials" });
  });

  // --- [On Play] [When Digivolving] --------------------------------------------------------

  /**
   * The public [When Digivolving] route: BT3-089 Boltmon is a Lv.6 purple Digimon with no
   * printed text, so it satisfies the "Purple Lv.6 : 6" EvoCost row and contributes nothing of
   * its own — and, not being [Bagra Army], it confers nothing through the [All Turns] clause
   * either.
   */
  async function digivolveIntoDarkness(s: ReturnType<typeof setupEngine>): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("darkness").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === CARD_ID && s.state.pendingDecision == null);
  }

  it("Q5161 places the hidden hand card, pays 3 [Bagra Army] trash cards on top, and deletes", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "BT10-073", as: "firstPay" },
            { card: "BT10-077", as: "secondPay" },
            { card: "EX10-027", as: "thirdPay" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const hostPermanentId = s.perm("host").permanentId;

    await digivolveIntoDarkness(s);

    // The opponent's hand card left their hand for the bottom of the host's digivolution cards,
    // and the host was then deleted, so both cards are in the opponent's trash.
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostPermanentId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("handCard").instanceId, s.inst("existing").instanceId]),
    );

    // The 3 [Bagra Army] cards left the trash and sit as the TOP digivolution cards — directly
    // beneath this Digimon and above the Lv.6 source it digivolved from.
    const paid = ["firstPay", "secondPay", "thirdPay"].map((alias) => s.inst(alias).instanceId);
    const stack = s.perm("source").stack.map(({ instanceId }) => instanceId);
    expect(stack).toHaveLength(4);
    expect(stack.slice(1)).toEqual(expect.arrayContaining(paid));
    expect(stack[0]).toBe(s.inst("source").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(expect.arrayContaining(paid));
    expect(s.state.pendingDecision == null).toBe(true);
  });

  it("Q5161 refuses to part-pay the deletion condition with only 2 matching trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "BT10-073", as: "firstPay" },
            { card: "BT10-077", as: "secondPay" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const hostPermanentId = s.perm("host").permanentId;

    await digivolveIntoDarkness(s);

    // The mandatory first sentence still resolved…
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("handCard").instanceId,
      s.inst("existing").instanceId,
    ]);
    // …but the "by placing 3" condition cannot be part-paid, so nothing was placed and nothing
    // was deleted.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostPermanentId);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstPay").instanceId, s.inst("secondPay").instanceId]),
    );
  });

  it("deletes only a permanent that has cards under it", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "BT10-073", as: "firstPay" },
            { card: "BT10-077", as: "secondPay" },
            { card: "EX10-027", as: "thirdPay" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [
            { card: "BT17-083", as: "tamer" },
            { card: "BT1-014", as: "bare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 6;
    await s.ready();
    // Steer the placement onto the Tamer so the opposing Digimon keeps an empty stack.
    preferInstanceIds.push(s.perm("tamer").permanentId);
    const barePermanentId = s.perm("bare").permanentId;

    await digivolveIntoDarkness(s);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([barePermanentId]);
    expect(s.perm("bare").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("handCard").instanceId, s.inst("tamer").instanceId]),
    );
  });

  it("Q5162 places the card at the very bottom of a Tamer that already has cards under it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [
            {
              card: "BT17-083",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "lower" },
                { card: "BT1-014", as: "upper" },
              ],
            },
          ],
        },
      },
      // No [Bagra Army] card in the trash, so the "by placing 3" condition cannot be met and
      // the Tamer survives to be inspected.
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await digivolveIntoDarkness(s);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("handCard").instanceId,
      s.inst("lower").instanceId,
      s.inst("upper").instanceId,
    ]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("Q5163 cannot place the card under an opposing Digimon that effects can't affect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          // BT15-047 Kabuterimon prints "[All Turns] While this Digimon is suspended, it isn't
          // affected by the effects of your opponent's Digimon" — and the opponent controls no
          // Tamer, so there is no other legal host.
          battleArea: [{ card: "BT15-047", as: "immune", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await digivolveIntoDarkness(s);

    expect(s.perm("immune").stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("handCard").instanceId]);
  });

  /**
   * Q5164 / Q5165 control: a DIGIMON that receives the placed card does gain its inherited
   * effect. EX10-026 SkullKnightmon's inherited effect is ＜Blocker＞, so the host opens a block
   * window it could not open before.
   */
  it("a Digimon host gains the placed card's inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
        },
        1: {
          hand: [{ card: "EX10-026", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    await digivolveIntoDarkness(s);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("handCard").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q5164 a Tamer host does not gain the placed card's inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
        },
        1: {
          hand: [{ card: "EX10-026", as: "handCard" }],
          // The opponent's only permanent is a Tamer, so it is the only legal host.
          battleArea: [{ card: "BT17-083", as: "tamer" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    await digivolveIntoDarkness(s);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("handCard").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    // No ＜Blocker＞ reached the Tamer: no block window ever opened, and with none open the
    // opponent's decline is out of phase.
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("tamer").permanentId);
  });

  /**
   * Q5165: a [Marcus Damon] that BT17-087's [On Play] is treating as a Digimon DOES gain the
   * placed card's inherited effect, until it stops being treated as one.
   *
   * Not reachable through public intents. BT17-087 grants `kinds: ["Digimon"]` only from its own
   * [On Play], so the opponent must play it on THEIR turn; the grant's duration is
   * `untilOpponentTurnEnd`. The ruling's observable half is BT12-038's inherited effect, which
   * is printed `[Your Turn] [Once Per Turn] If one of your yellow or red Tamers becomes
   * suspended…` — "your turn" being the Tamer controller's turn. So the only turn on which the
   * inherited effect can fire is the opponent's, and the only turn on which this card can place
   * the material is ours. The two windows never overlap, and no public intent suspends an
   * opponent's Tamer on their own turn.
   *
   * The half that is testable is proved above: a Digimon host gains the placed card's inherited
   * effect ("a Digimon host gains…"), a plain Tamer host does not (Q5164). The report records
   * this ruling as untestable through public intents for the reason above.
   */
  // --- [All Turns] conferral from level 6 [Bagra Army] digivolution cards -------------------

  it("Q5166 a [Bagramon] DigiXros material is already in the stack, so its [All Turns] fires", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkness" },
            { card: "EX10-056", as: "bagramon" },
            { card: "BT7-063", as: "darkknight" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host" }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagramon").instanceId, s.inst("darkknight").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    // The [On Play] placed the opponent's hand card under their Digimon; the conferred EX10-056
    // watcher saw that placement and paid 2 digivolution cards to trash their top security card.
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("handCard").instanceId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("darkness").stack).toHaveLength(0);
  });

  it("Q5167 a [Bagramon] placed BY this effect does not fire for the placement that preceded it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "EX10-056", as: "bagramon" },
            { card: "BT10-073", as: "secondPay" },
            { card: "BT10-077", as: "thirdPay" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await digivolveIntoDarkness(s);

    // EX10-056 only reached the stack as part of the "by placing 3" payment, after the hand-card
    // placement had already resolved, so no security card was trashed.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("bagramon").instanceId);
    expect(s.perm("source").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q5168 a [Lilithmon] placed BY this effect fires for the deletion that follows it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "EX10-058", as: "lilithmon" },
            { card: "BT10-073", as: "secondPay" },
            { card: "BT10-077", as: "thirdPay" },
            // The payoff of the conferred [All Turns]: a purple level 4 Digimon card, played
            // from the trash without paying the cost.
            { card: "BT4-080", as: "payoff" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await digivolveIntoDarkness(s);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT4-080"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT4-080")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("payoff").instanceId);
    // The conferred effect paid with 2 of this Digimon's digivolution cards.
    expect(s.perm("source").stack).toHaveLength(2);
  });

  it("Q5169 a [Tactimon] placed BY this effect prevents this Digimon from leaving in the interrupt", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkness" }],
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT3-089", as: "source" }],
          trash: [
            { card: "EX10-055", as: "tactimon" },
            { card: "BT10-073", as: "secondPay" },
            { card: "BT10-077", as: "thirdPay" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          // EX7-061 Lilithmon (X Antibody) prevents its own leaving "by deleting 1 other
          // Digimon" while [Lilithmon] is in its digivolution cards — EX10-058 is named
          // Lilithmon — and having cards under it also makes it a legal deletion target.
          battleArea: [{ card: "EX7-061", as: "lilithX", under: [{ card: "EX10-058", as: "lilithSource" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await digivolveIntoDarkness(s);

    // The conferred [Tactimon] replacement kept this Digimon on the board, so EX7-061's own
    // "by deleting 1 other Digimon" condition went unmet and EX7-061 was deleted after all.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain(CARD_ID);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // The prevention is not free: [Tactimon]'s conferred cost trashed 2 of the 4 digivolution
    // cards. Without this the test would also pass if EX7-061's replacement never fired at all.
    expect(s.perm("source").stack).toHaveLength(2);
  });
});
