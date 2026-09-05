# Training activation in breeding

CR 16-41 permits Training in breeding as well as in the battle area. The
ordinary activated-effect builder must not admit unrelated Main effects in
breeding merely to expose this keyword.

Retain the existing synthesized Training effect index and append an explicit
breeding variant. Publish activated abilities for the breeding permanent, while
the builder rejects ordinary Main effects there. Training suspends its host and
places the deck's top card face down at the bottom of the stack.

Training has no inherent Once Per Turn cap. After an independent unsuspend,
the same host can train again during the same turn. Field and breeding runtime
tests prove both placements, their exact bottom order, re-suspension, and the
exhausted deck. Existing tests reject an ordinary breeding Main activation.

Independent review found no blocking issue. Focused EX9-051 and builder tests,
API typecheck and scoped style checks govern this delivery; collection closure
still requires the other audit blocks and final gates.
