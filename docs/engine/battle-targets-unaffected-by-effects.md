# Battle targets unaffected by effects

A direct battle created by an effect is resolved as rules processing. A Digimon unaffected by the
source's effects remains a legal chosen battle participant and can be deleted by the resulting DP
comparison, while effect actions such as returning its digivolution cards still fail normally.

The interpreter now preserves unaffected permanents through pure `SelectBind` bookkeeping and
through `Battle` participant selection. Optional battle confirmation remains on the ordinary action
path. EX13-076 Q7458 covers the composed bind/return/battle flow; EX13-077 Q7469 covers a direct
modal battle.
