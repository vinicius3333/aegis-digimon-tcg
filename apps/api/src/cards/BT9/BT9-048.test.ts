import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-048.js";

auditEffectlessDigimon({
  cardId: "BT9-048",
  expected: {
    cardId: "BT9-048",
    nameEn: "Ninjamon",
    colors: ["Green"],
    kinds: ["Digimon"],
    level: 4,
    playCost: 4,
    dp: 6000,
    evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
    forms: ["Champion"],
    attributes: ["Data"],
    types: ["Mutant"],
  },
  compiled,
  validBase: "BT9-045",
  invalidBase: "BT9-019",
});
