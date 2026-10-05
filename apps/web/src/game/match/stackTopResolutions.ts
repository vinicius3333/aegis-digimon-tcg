import type { ServerEvent } from "@aegis/shared";
import type { AnimationStepContext } from "../animationQueue";
import { CONSEQUENCE_GATE_MAX_MS } from "./presentationGate";

type Resolution = Extract<ServerEvent, { kind: "stackTopResolved" }>;

/** Public passive results are received independently of the scene that will consume them. */
export function createStackTopResolutions() {
  const results = new Map<string, Resolution>();
  const keyOf = (sequenceId: string, strippedInstanceId: string) => JSON.stringify([sequenceId, strippedInstanceId]);
  return {
    record(events: readonly ServerEvent[]) {
      for (const event of events) {
        if (event.kind !== "stackTopResolved") continue;
        results.set(keyOf(event.sequenceId, event.strippedInstanceId), event);
        // Reconnect history and cancelled scenes can leave results with no consumer.
        if (results.size > 200) results.delete(results.keys().next().value!);
      }
    },
    clear() {
      results.clear();
    },
    async take({
      sequenceId,
      strippedInstanceId,
      permanentId,
      context,
    }: {
      sequenceId: string;
      strippedInstanceId: string;
      permanentId: string;
      context: AnimationStepContext;
    }): Promise<Resolution | undefined> {
      const key = keyOf(sequenceId, strippedInstanceId);
      const deadline = Date.now() + CONSEQUENCE_GATE_MAX_MS;
      while (context.mode === "live" && !context.skipping && !context.cancelled) {
        const result = results.get(key);
        if (result) {
          results.delete(key);
          if (result.permanentId !== permanentId)
            throw new Error("Stack top resolution does not match the physical promotion");
          return result;
        }
        if (Date.now() >= deadline) throw new Error("Stack top resolution did not arrive");
        await context.wait(16);
      }
      return undefined;
    },
  };
}

export type StackTopResolutions = ReturnType<typeof createStackTopResolutions>;
