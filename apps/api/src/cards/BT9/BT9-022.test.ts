import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-022.js";

auditEffectlessDigimon({
  cardId: "BT9-022",
  expected: {
    cardId: "BT9-022",
    nameEn: "Ebidramon",
    colors: ["Blue"],
    kinds: ["Digimon"],
    level: 4,
    playCost: 3,
    dp: 5000,
    evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    forms: ["Champion"],
    attributes: ["Data"],
    types: ["Aquatic"],
  },
  compiled,
  validBase: "BT9-019",
  invalidBase: "BT9-032",
});
