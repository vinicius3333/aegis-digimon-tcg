"""Learn newly introduced identities while retaining every pre-existing model column."""

import torch

from features import FeatureEncoder
from migrate import column_map
from model import CandidatePolicy


class VocabularyAdaptation:
    def __init__(
        self,
        model: CandidatePolicy,
        optimizer: torch.optim.Adam,
        encoder: FeatureEncoder,
        original_card_ids: list[str],
    ) -> None:
        if not set(original_card_ids) < set(encoder.card_ids):
            raise ValueError("Vocabulary adaptation requires a saved, expanded card vocabulary")
        original = FeatureEncoder(original_card_ids, list(encoder.keyword_names))
        self.added_card_ids = sorted(set(encoder.card_ids) - set(original_card_ids))
        self.parameters = {
            name: parameter
            for name, parameter in model.named_parameters()
            if name in {"state.0.weight", "action.0.weight"}
        }
        columns = {
            "state.0.weight": column_map(original.state_columns, encoder.state_columns),
            "action.0.weight": column_map(original.action_columns, encoder.action_columns),
        }
        self.masks = {
            name: torch.tensor(columns[name].added, device=parameter.device)
            for name, parameter in self.parameters.items()
        }
        self.weights = {
            name: parameter.detach().clone() for name, parameter in self.parameters.items()
        }
        moment_names = ["exp_avg", "exp_avg_sq"]
        if optimizer.param_groups[0].get("amsgrad"):
            moment_names.append("max_exp_avg_sq")
        self.moments = {
            name: {
                field: (
                    optimizer.state[parameter][field].clone()
                    if field in optimizer.state.get(parameter, {})
                    else torch.zeros_like(parameter)
                )
                for field in moment_names
            }
            for name, parameter in self.parameters.items()
        }
        for name, parameter in self.parameters.items():
            if parameter.shape[1] != len(self.masks[name]) or any(
                moment.shape != parameter.shape for moment in self.moments[name].values()
            ):
                raise ValueError("Adaptation input or Adam shape differs from the encoder")
        for parameter in model.parameters():
            parameter.requires_grad_(False)
            parameter.grad = None
        for name, parameter in self.parameters.items():
            parameter.requires_grad_(True)
            parameter.register_hook(lambda gradient, mask=self.masks[name]: gradient * mask)
        self.trainable_identity_parameters = sum(
            int(self.masks[name].sum()) * parameter.shape[0]
            for name, parameter in self.parameters.items()
        )

    def restore_existing_columns(self, optimizer: torch.optim.Adam) -> None:
        """Masked gradients alone do not stop Adam's retained momentum from moving old weights."""
        with torch.no_grad():
            for name, parameter in self.parameters.items():
                old = ~self.masks[name]
                parameter[:, old] = self.weights[name][:, old]
                state = optimizer.state.get(parameter, {})
                for field, original in self.moments[name].items():
                    if field in state:
                        state[field][:, old] = original[:, old]
        # The two active parameters' scalar Adam steps advance with actual updates.
        # All other parameters, their moments and their steps remain untouched.
