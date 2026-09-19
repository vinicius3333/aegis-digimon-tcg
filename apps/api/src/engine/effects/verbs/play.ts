import { peekCheckedCard, takeCheckedCard } from "../../security/checkedCard.js";
import {
  CardKind,
  Permanent,
  Zone,
  EffectTiming,
  requireCardDefinition,
  digiXrosRequirementFor,
  type Seat,
} from "@aegis/shared";
import { extractCardAt, extractPermanentAt, setBreeding } from "../../state/access.js";
import { isOption } from "../../cards/cardData.js";
import type { Primitives } from "../EffectContext.js";
import { isPermanentKind, placePermanent } from "../verbs/cardPlacement.js";
import {
  hostOfStackInstance,
  locateInHand,
  locateInSecurity,
  looseZoneOfInstance,
  ownerSeatOfLoose,
  peekLooseInstance,
  removeLooseInstance,
} from "../verbs/looseInstances.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Playing a card from hand or security.
 */

export function createPlayVerbs(pc: PrimitivesContext) {
  const { engine, continuous, effectSeatStack, player, state } = pc;
  // Reached through the context because these are built in sibling modules: the
  // whole set exists before any of it runs, so forwarding at call time is safe.
  const effectDrivenPlayCost: PrimitivesContext["helpers"]["effectDrivenPlayCost"] = (...args) =>
    pc.helpers.effectDrivenPlayCost(...args);
  const placeUnder: Primitives["placeUnder"] = (...args) => pc.fx.placeUnder(...args);
  const relocatePermanentByEffect: NonNullable<Primitives["relocatePermanentByEffect"]> = (...args) =>
    pc.fx.relocatePermanentByEffect!(...args);

  const playFromHand = async (
    instanceIds: string[],
    opts?: { payCost?: boolean; suspended?: boolean; costDelta?: number },
  ): Promise<Permanent[]> => {
    const created: Permanent[] = [];
    for (const instanceId of instanceIds) {
      const located = locateInHand(state, instanceId);
      if (located === undefined) continue;
      const { owner, index } = located;
      const definition = requireCardDefinition(owner.hand[index]!.cardId);
      if (!isPermanentKind(definition) || isOption(definition)) continue;
      const effectSeat = effectSeatStack.at(-1) ?? owner.seat;
      if (continuous.isPlayBlocked(effectSeat, definition, "play", true, "hand")) continue;
      if (opts?.payCost) {
        const cost = await effectDrivenPlayCost(
          instanceId,
          definition,
          owner.seat,
          opts.costDelta,
          false,
          undefined,
          "hand",
        );
        if (engine.memory.maxCostFor(owner.seat) < cost) continue; // unaffordable: skip (no partial pay)
        if (cost > 0) engine.memory.pay(owner.seat, cost, "playCard");
      }
      const instance = extractCardAt(owner, Zone.Hand, index)!;
      instance.faceUp = true;
      const permanent = placePermanent(engine, owner, instance, definition, opts?.suspended ?? false);
      created.push(permanent);
      engine.emit({
        kind: "cardPlayed",
        seat: owner.seat,
        cardId: instance.cardId,
        ...(instance.artId ? { artId: instance.artId } : {}),
        permanentId: permanent.permanentId,
      });
      engine.emit({
        kind: "cardsMoved",
        instanceIds: [instance.instanceId],
        from: Zone.Hand,
        to: Zone.BattleArea,
      });
    }
    return created;
  };

  const playFromSecurity = async (instanceId: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined> => {
    const located = locateInSecurity(state, instanceId);
    const checked = peekCheckedCard(state, instanceId);
    const owner = located?.owner ?? (checked === undefined ? undefined : state.players[checked.seat]);
    const card = located === undefined ? checked?.card : located.owner.security[located.index];
    if (owner === undefined || card === undefined) return undefined;
    const definition = requireCardDefinition(card.cardId);
    if (!isPermanentKind(definition) || isOption(definition)) return undefined;
    const effectSeat = effectSeatStack.at(-1) ?? owner.seat;
    if (continuous.isPlayBlocked(effectSeat, definition, "play", true, "security")) return undefined;
    if (opts?.payCost) {
      const cost = await effectDrivenPlayCost(instanceId, definition, owner.seat, 0, false, undefined, "security");
      if (engine.memory.maxCostFor(owner.seat) < cost) return undefined;
      if (cost > 0) engine.memory.pay(owner.seat, cost, "playCard");
    } else {
      // Free security-origin plays retain optional would-be-played costs (Q4784).
      await engine.finalizeEffectPlayCost?.(instanceId, 0, false, "security");
    }
    // Payment windows may reorder security; remove the selected instance, not a stale index.
    const currentIndex = owner.security.findIndex((candidate) => candidate.instanceId === instanceId);
    const instance =
      currentIndex < 0 ? takeCheckedCard(state, instanceId) : extractCardAt(owner, Zone.Security, currentIndex);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const permanent = placePermanent(engine, owner, instance, definition, false);
    engine.emit({
      kind: "cardPlayed",
      seat: owner.seat,
      cardId: instance.cardId,
      ...(instance.artId ? { artId: instance.artId } : {}),
      permanentId: permanent.permanentId,
    });
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: Zone.Security,
      to: Zone.BattleArea,
    });
    // A [Security] effect that says "play this card" is still an effect-driven play: its own
    // [On Play] window resolves, then watchers such as ST10-06 see a `whenPlayed` event with the
    // trigger-time level snapshot. The snapshot is captured from `definition` before either
    // window can change or remove the permanent (KB Q737/Q738).
    await engine.fireEnteredByEffect?.(EffectTiming.OnPlay, instance.instanceId, owner.seat, {
      playedFromZone: "security",
    });
    // Playing a card from security is still an effect-driven removal from that stack. Publish
    // both security-removal buses after the entering card's effects have installed its live
    // watchers, so cards such as BT15-037 observe the same-time removal (KB Q2519).
    // The check already removed a staged card. Moving it into play creates no second removal.
    if (checked === undefined) {
      await engine.fireSubTrigger?.("whenEffectRemovesFromSecurity", { removedFromSecuritySeat: owner.seat });
      await engine.fireSubTrigger?.("whenSecurityRemoved", {
        removedFromSecuritySeat: owner.seat,
        securityRemovedByEffect: true,
      });
    }
    await engine.fireSubTrigger?.("whenPlayed", {
      subjectPermanentId: permanent.permanentId,
      playedByEffect: true,
      playedFromZone: "security",
      ...(definition.level !== undefined ? { playedLevel: definition.level } : {}),
      ...(definition.playCost !== undefined ? { playedPlayCost: definition.playCost } : {}),
    });
    return permanent;
  };

  /**
   * Play specific loose card instances as new battle-area permanents (the generalized
   * PlayWithoutCost: "play 1 [X] from your hand/trash/security/deck/under your Tamers
   * without paying the cost"). Each instance is located wherever it currently sits
   * (hand, security, deck, trash, breeding, or as a digivolution/linked card under
   * another permanent — NOT a permanent's top card) and removed from there; only a
   * permanent kind is placed. `payCost` pays the printed play cost if affordable;
   * the default is free. Returns the created permanents.
   */
  const playInstances = async (
    instanceIds: string[],
    opts?: {
      payCost?: boolean;
      suspended?: boolean;
      breeding?: boolean;
      costDelta?: number;
      costDeltaByPlay?: Record<string, number>;
      costOverride?: number;
      suppressOnPlayEffects?: boolean;
      effectSourceCardId?: string;
      playedByDecode?: boolean;
      digiXrosMaterialInstanceIds?: string[];
      digiXrosMaterialInstanceIdsByPlay?: Record<string, string[]>;
      assemblyMaterialInstanceIds?: string[];
      assemblyMaterialInstanceIdsByPlay?: Record<string, string[]>;
      hostPermanentIds?: Record<string, string>;
    },
  ): Promise<Permanent[]> => {
    const created: Permanent[] = [];
    // Snapshot which (if any) of the played instances originate from a digivolution stack
    // BEFORE removal, so the whenPlayed fire can set playedFromZone for the
    // `fromDigivolution` sourceFilter gate (BT20-028 KB Q4321).
    const originByInstance = new Map(instanceIds.map((id) => [id, looseZoneOfInstance(state, id)]));
    const securityOriginSeats = new Set<Seat>();
    for (const instanceId of instanceIds) {
      const owner = ownerSeatOfLoose(state, instanceId);
      if (owner === undefined) continue;
      const ownerPlayer = player(owner);
      const peek = peekLooseInstance(state, instanceId);
      if (peek === undefined) continue;
      const definition = requireCardDefinition(peek.cardId);

      // Breeding play: gate to Digimon/DigiEgg only (§6-4), require empty breeding slot
      if (opts?.breeding) {
        if (!(definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.DigiEgg))) continue;
        if (ownerPlayer.breeding !== undefined) continue; // single-occupancy — no-op
      }

      // DUAL cards have no play cost and cannot be played, even for free (CR 7-1-1).
      // Keep DigiEgg breeding plays and token placement on their existing dedicated paths.
      if (!isPermanentKind(definition) || isOption(definition)) continue;
      const effectSeat = effectSeatStack.at(-1) ?? ownerPlayer.seat;
      if (continuous.isPlayBlocked(effectSeat, definition, "play", true, originByInstance.get(instanceId))) continue;
      if (opts?.payCost) {
        const requirement = digiXrosRequirementFor(definition.cardId)?.[0];
        const playMaterials = opts.digiXrosMaterialInstanceIdsByPlay?.[instanceId] ?? opts.digiXrosMaterialInstanceIds;
        const materialCount = playMaterials?.length ?? 0;
        const perMaterialReduction =
          requirement?.count === "∞" ? (requirement.costReduction ?? 1) : (requirement?.count ?? 0);
        const digiXrosReduction = materialCount * perMaterialReduction;
        const cost = await effectDrivenPlayCost(
          instanceId,
          definition,
          ownerPlayer.seat,
          (opts.costDeltaByPlay?.[instanceId] ?? opts.costDelta ?? 0) + digiXrosReduction,
          false,
          opts.costOverride,
          originByInstance.get(instanceId),
        );
        if (engine.memory.maxCostFor(ownerPlayer.seat) < cost) continue;
        if (cost > 0) engine.memory.pay(ownerPlayer.seat, cost, "playCard");
      } else {
        // A free play still opens the would-be-played window (EX9-030 Q4784).
        // Optional processing costs may be paid, but its result cannot charge memory.
        await engine.finalizeEffectPlayCost?.(instanceId, 0, false, originByInstance.get(instanceId));
      }
      // Preserve the resolved host when moving stack material.  A material selected from
      // the breeding stack must be detached from that exact permanent before the new
      // permanent is placed; falling back to the global loose lookup can otherwise retain
      // stale breeding material when the same instance id is observed through another view.
      const resolvedHostPermanentId =
        hostOfStackInstance(state, instanceId)?.hostPermanentId ?? opts?.hostPermanentIds?.[instanceId];
      const instance = removeLooseInstance(state, instanceId, true, resolvedHostPermanentId);
      if (instance === undefined) continue;
      instance.faceUp = true;
      const permanent = placePermanent(engine, ownerPlayer, instance, definition, opts?.suspended ?? false);
      if (originByInstance.get(instanceId) === "security") securityOriginSeats.add(ownerPlayer.seat);
      // Breeding: relocate permanent from battle area to breeding slot
      if (opts?.breeding) {
        const idx = ownerPlayer.battleArea.findIndex((p) => p.permanentId === permanent.permanentId);
        if (idx >= 0) extractPermanentAt(ownerPlayer, idx);
        permanent.inBreeding = true;
        setBreeding(ownerPlayer, permanent);
      }
      created.push(permanent);
      const playMaterials = opts?.digiXrosMaterialInstanceIdsByPlay?.[instanceId] ?? opts?.digiXrosMaterialInstanceIds;
      if ((playMaterials?.length ?? 0) > 0) {
        for (const materialInstanceId of playMaterials!) {
          let fieldMaterial: Permanent | undefined;
          for (const candidatePlayer of state.players) {
            fieldMaterial = candidatePlayer.battleArea.find(
              (candidatePermanent) => candidatePermanent.topCard?.instanceId === materialInstanceId,
            );
            if (fieldMaterial !== undefined) break;
          }
          if (fieldMaterial !== undefined && fieldMaterial.permanentId !== permanent.permanentId) {
            await relocatePermanentByEffect(permanent.permanentId, fieldMaterial.permanentId, {
              belowTop: false,
              faceUp: true,
              shedOwnCards: true,
            });
          } else {
            await placeUnder(permanent.permanentId, [materialInstanceId]);
          }
        }
      }
      const assemblyMaterials =
        opts?.assemblyMaterialInstanceIdsByPlay?.[instanceId] ?? opts?.assemblyMaterialInstanceIds;
      for (const materialInstanceId of assemblyMaterials ?? []) {
        await placeUnder(permanent.permanentId, [materialInstanceId]);
      }
      engine.emit({
        kind: "cardPlayed",
        seat: ownerPlayer.seat,
        cardId: instance.cardId,
        ...(instance.artId ? { artId: instance.artId } : {}),
        permanentId: permanent.permanentId,
      });
      engine.emit({
        kind: "cardsMoved",
        instanceIds: [instance.instanceId],
        from: "various",
        to: opts?.breeding ? Zone.Breeding : Zone.BattleArea,
      });
    }
    if (created.length > 0 && !opts?.breeding) {
      // A played permanent is already in the battle area before its [On Play] resolves.
      // Install its continuous effects and reactive subscriptions now so they can observe
      // nested events caused by that [On Play] (BT10-085: Sistermon Ciel must see the
      // Royal Knight digivolution performed by her own effect).
      await engine.recomputeContinuousEffects?.();
      const triggerSubject = created[0]!;
      const triggerSubjectTop = triggerSubject.topCard;
      const playedLevel =
        triggerSubjectTop === undefined ? undefined : requireCardDefinition(triggerSubjectTop.cardId).level;
      const playedPlayCost =
        triggerSubjectTop === undefined ? undefined : requireCardDefinition(triggerSubjectTop.cardId).playCost;
      // Each effect-played Digimon's OWN [On Play] fires (it was PLAYED, not merely placed), with
      // `enteredByEffect` set to its controller (the producer for the BT25-084 by-effect gate). A
      // manual hand play takes the play action's own seam, which leaves the marker unset.
      if (opts?.suppressOnPlayEffects !== true) {
        for (const permanent of created) {
          if (permanent.topCard === undefined) continue;
          const playMaterials =
            opts?.digiXrosMaterialInstanceIdsByPlay?.[permanent.topCard.instanceId] ??
            opts?.digiXrosMaterialInstanceIds;
          await engine.fireEnteredByEffect?.(
            EffectTiming.OnPlay,
            permanent.topCard.instanceId,
            permanent.controllerSeat,
            {
              ...(originByInstance.get(permanent.topCard.instanceId) !== undefined
                ? { playedFromZone: originByInstance.get(permanent.topCard.instanceId)! }
                : {}),
              ...(playMaterials !== undefined ? { digiXrosMaterialCount: playMaterials.length } : {}),
              ...(opts?.effectSourceCardId !== undefined
                ? { playedByEffectSourceCardId: opts.effectSourceCardId }
                : {}),
              ...(opts?.playedByDecode === true ? { playedByDecode: true } : {}),
              ...(instanceIds.length > 1 ? { deferWhenPlayed: true } : {}),
            },
          );
        }
      }
      // Generic PlayWithoutCost can source permanents directly from security. That move is
      // still an effect-driven security removal, just like playFromSecurity above. Publish
      // the buses after On Play has installed live watchers so the entering card can observe
      // its own same-time removal (BT15-037 / KB Q2519).
      for (const seat of securityOriginSeats) {
        await engine.fireSubTrigger?.("whenEffectRemovesFromSecurity", { removedFromSecuritySeat: seat });
        await engine.fireSubTrigger?.("whenSecurityRemoved", {
          removedFromSecuritySeat: seat,
          securityRemovedByEffect: true,
        });
      }
      // An EFFECT just played one or more Digimon (Q3665: "when an effect plays one of your Digimon").
      // Fire the whenPlayed bus ONCE for the play event (KB Q3664: a single effect that plays 2+ at
      // once triggers the watcher only once), marked effect-driven so a "when an effect plays" watcher
      // (EX5-062) fires while manual hand plays (which leave `playedByEffect` unset) do not. Breeding
      // placements are not "plays" in this sense and are excluded.
      // `playedFromZone` is set when ANY played instance originated from a digivolution stack so a
      // `fromDigivolution: true` sourceFilter (BT20-028 KB Q4321) can gate on the source zone.
      // The snapshot `fromDigivolutionIds` was captured before removal to survive the splicing.
      const playedFromZone =
        triggerSubjectTop === undefined ? undefined : originByInstance.get(triggerSubjectTop.instanceId);
      await engine.fireSubTrigger?.("whenPlayed", {
        subjectPermanentId: triggerSubject.permanentId,
        subjectPermanentIds: created.map((permanent) => permanent.permanentId),
        playedByEffect: true,
        ...(opts?.effectSourceCardId !== undefined ? { playedByEffectSourceCardId: opts.effectSourceCardId } : {}),
        ...(opts?.playedByDecode === true ? { playedByDecode: true } : {}),
        ...(playedLevel !== undefined ? { playedLevel } : {}),
        ...(playedPlayCost !== undefined ? { playedPlayCost } : {}),
        ...(playedFromZone !== undefined ? { playedFromZone } : {}),
      });
    }
    return created;
  };

  /**
   * Place a loose Option card into its owner's battle area as a battle-area PERMANENT
   * (source CanPlayAsNewPermanent isPlayOption:true / PlaceDelayOptionCards). `playInstances`
   * skips Options (isPermanentKind excludes Option); this is the dedicated option-permanent
   * placement path. Gated to Option kind so it cannot place a non-Option card; a missing or
   * non-Option instance is a no-op. The Option enters as a 0-DP permanent (placePermanent), is
   * face up, and emits cardPlayed + cardsMoved. Does NOT pay a cost (the placement is a free
   * "place ... in your battle area", not a use). Returns the created Permanent or undefined.
   */
  const placeOptionAsPermanent = async (instanceId: string): Promise<Permanent | undefined> => {
    const owner = ownerSeatOfLoose(state, instanceId);
    if (owner === undefined) return undefined;
    const ownerPlayer = player(owner);
    const peek = peekLooseInstance(state, instanceId);
    if (peek === undefined) return undefined;
    const definition = requireCardDefinition(peek.cardId);
    // Strictly an Option-permanent path: do NOT broaden the normal permanent kinds.
    if (!isOption(definition)) return undefined;
    // §9-1-5's placement exception: the card being placed may be the Option that is
    // still resolving its own [Main] body, which `removeLooseInstance` claims out of
    // `resolvingOption` below. That makes this movement the used Option's final
    // routing, so it carries the same marker the trash route emits — the client's
    // resolving-Option dock closes on it and would otherwise sit on screen until its
    // failsafe ceiling.
    const routesUsedOption = ownerPlayer.resolvingOption?.instanceId === instanceId;
    const instance = removeLooseInstance(state, instanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const permanent = placePermanent(engine, ownerPlayer, instance, definition, false);
    // CR 17-1-3-2-2 exempts Options placed in the battle area BY AN EFFECT from the
    // rule-check trash sweep; mark the origin so the sweep can tell them apart.
    permanent.placedByEffect = true;
    engine.emit({
      kind: "cardPlayed",
      seat: ownerPlayer.seat,
      cardId: instance.cardId,
      ...(instance.artId ? { artId: instance.artId } : {}),
      permanentId: permanent.permanentId,
    });
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: "various",
      to: Zone.BattleArea,
      ...(routesUsedOption ? { optionUsed: true as const } : {}),
    });
    // Option cards placed as permanents are a distinct event from using an Option effect:
    // inherited watchers such as BT13-007's Royal Knight clause react here, after the
    // permanent exists so sourceFilter can inspect its kind/trait/controller.
    await engine.fireSubTrigger?.("whenOptionPlayed", { subjectPermanentId: permanent.permanentId });
    return permanent;
  };

  return { playFromHand, playFromSecurity, playInstances, placeOptionAsPermanent };
}
