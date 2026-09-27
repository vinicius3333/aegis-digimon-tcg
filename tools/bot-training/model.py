"""Shared candidate scorer: variable legal-action lists need no fixed action vocabulary."""

import torch
from torch import nn


class CandidatePolicy(nn.Module):
    def __init__(self, state_dim: int, action_dim: int, width: int = 128) -> None:
        super().__init__()
        self.state = nn.Sequential(
            nn.Linear(state_dim, width), nn.Tanh(), nn.Linear(width, width), nn.Tanh()
        )
        self.action = nn.Sequential(
            nn.Linear(action_dim, width), nn.Tanh(), nn.Linear(width, width)
        )
        self.score = nn.Sequential(nn.Tanh(), nn.Linear(width, 1))
        self.value = nn.Linear(width, 1)

    def forward(
        self, state: torch.Tensor, actions: torch.Tensor, mask: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        context = self.state(state)
        logits = self.score(context[:, None, :] + self.action(actions)).squeeze(-1)
        return logits.masked_fill(~mask, -torch.inf), self.value(context).squeeze(-1)
