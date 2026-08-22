import { EffectTiming, isDigimon, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-069 — Gaia Reactor.
const deleteExceptHighest = (controller: "mine" | "opponent") => ({
  kind: "Delete",
  target: {
    filter: { controller, kind: ["Digimon"] },
    count: "all",
    except: {
      filter: { controller, kind: ["Digimon"] },
      count: 1,
      selector: "highestPlayCost",
    },
  },
});

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [deleteExceptHighest("mine"), deleteExceptHighest("opponent")],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            except: {
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
                selector: "highestPlayCost",
            },
            count: "all",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            except: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: 1,
                selector: "highestPlayCost",
            },
            count: "all",
          },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
