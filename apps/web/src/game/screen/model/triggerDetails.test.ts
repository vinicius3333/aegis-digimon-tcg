import { describe, expect, it } from "vitest";
import type { DecisionRequest } from "@aegis/shared/protocol/events";
import { buildTriggerKey } from "@aegis/shared/protocol/triggerKey";
import { CardInstance } from "@aegis/shared/schema/CardInstance";
import { Permanent } from "@aegis/shared/schema/Permanent";
import { PlayerState, SecurityCardView } from "@aegis/shared/schema/PlayerState";
import { translator } from "@/i18n/translator";
import { triggerDetailsFor } from "@/game/screen/model/triggerDetails";

function card(instanceId: string, cardId = "BT1-001"): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  return instance;
}

function permanent(permanentId: string, topInstanceId: string, stackInstanceIds: readonly string[] = []): Permanent {
  const unit = new Permanent();
  unit.permanentId = permanentId;
  unit.topCard = card(topInstanceId);
  unit.stack.push(...stackInstanceIds.map((instanceId) => card(instanceId)));
  return unit;
}

function orderTriggers(instanceIds: readonly string[]): DecisionRequest {
  return {
    decisionId: "order",
    seat: 0,
    kind: "orderTriggers",
    promptText: "Choose the order.",
    options: {
      triggerKeys: instanceIds.map((instanceId) => buildTriggerKey(instanceId, "BT1-001/0")),
      triggerCardIds: instanceIds.map(() => "BT1-001"),
    },
  };
}

function players() {
  const viewer = new PlayerState();
  viewer.battleArea.push(permanent("perm-1", "field-a"), permanent("perm-2", "field-b", ["inherited-b"]));
  viewer.breeding = permanent("perm-egg", "breeding-top");
  viewer.trash.push(card("trash-card"));
  viewer.delayZone.push(card("delay-card"));
  viewer.security.push(card("security-card"));
  const opponent = new PlayerState();
  opponent.battleArea.push(permanent("perm-3", "opponent-field"));
  const faceUp = new SecurityCardView();
  faceUp.instanceId = "opponent-security";
  faceUp.faceUp = true;
  opponent.securityView.push(faceUp);
  return { viewer, opponent };
}

function sourceLabels(instanceIds: readonly string[], handInstanceIds: readonly string[] = []) {
  const { viewer, opponent } = players();
  return triggerDetailsFor({
    decision: orderTriggers(instanceIds),
    viewer,
    opponent,
    handInstanceIds,
    t: translator("en"),
  }).map((detail) => detail.sourceLabel);
}

describe("trigger chooser source labels", () => {
  it("numbers field sources by their slot, including inherited sources", () => {
    expect(sourceLabels(["field-b", "inherited-b", "opponent-field"])).toEqual(["Field:2", "Field:2", "Field:1"]);
  });

  it("names the exact hand copy by its position in the displayed hand", () => {
    expect(sourceLabels(["copy-3", "copy-1"], ["copy-1", "other", "copy-3"])).toEqual(["Hand:3", "Hand:1"]);
  });

  it("labels trash, breeding, delay, and security sources", () => {
    expect(sourceLabels(["trash-card", "breeding-top", "delay-card", "security-card", "opponent-security"])).toEqual([
      "Trash",
      "Breeding",
      "Delay",
      "Security",
      "Security",
    ]);
  });

  it("leaves a source it cannot place unlabelled", () => {
    expect(sourceLabels(["unknown-card"])).toEqual([undefined]);
  });
});
