import { useEffect, useRef } from "react";
import { BoardAlliancePrompt } from "../../BoardDecisionRail";

/** Allies are selected on the field. An empty server window is passed without a prompt. */
export function AllianceOverlay({
  attackerCardId,
  allies,
  onPass,
}: {
  attackerCardId?: string;
  allies: readonly { permanentId: string; cardId: string; currentDP: number }[];
  onPass: () => void;
}) {
  const passed = useRef(false);
  useEffect(() => {
    if (allies.length || passed.current) return;
    passed.current = true;
    onPass();
  }, [allies.length, onPass]);
  if (!allies.length) return null;
  return <BoardAlliancePrompt attackerCardId={attackerCardId} onPass={onPass} />;
}
