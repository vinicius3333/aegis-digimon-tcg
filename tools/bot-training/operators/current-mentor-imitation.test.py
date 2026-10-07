"""Synthetic bounded admission/Adam guards; no real model, dataset or training."""

import copy
import hashlib
import importlib.util
import io
import os
import re
import struct
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

operator = Path(os.environ.get('AEGIS_MENTOR_IMITATION_OPERATOR', str(Path(__file__).with_name('current-mentor-imitation.py'))))
spec = importlib.util.spec_from_file_location('synthetic_mentor_imitation', operator)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
FAMILIES = ('linkCard', 'dnaDigivolve', 'appFusion', 'mainAssembly', 'mainAssemblyMaterial', 'effectAssemblyMaterial', 'mainDigiXros', 'effectDigiXrosMaterial')
PARAMETERS = [f'{layer}.{field}' for layer in ('state.0', 'state.2', 'action.0', 'action.2', 'score.1', 'value') for field in ('weight', 'bias')]
DATA_RUN = m.LAB / 'runs/rule-link-current-aa2e56463-mentor-data-r1'
CP = {'r4': {'path': str(m.LAB / 'runs/rule-link-current-aa2e56463-corrective-ppo-r4/ppo/checkpoint.pt'), 'sha256': '1de36f6a1e7fc439fe34c4af71d81976a5e0b74e38fa17cd417e63dea07924c1'}}


def report():
    counts = {f'{family}:seat{seat}': 2 for family in FAMILIES for seat in (0, 1)}
    counts.update({'attack:seat0': 50, 'attack:seat1': 50})
    return {'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'games': 3872, 'actualLearningUpdates': 0,
        'eligibleForMechanismResampling': True, 'all181VisibleBothSeats': True, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False,
        'mechanismCoverage': {'allMechanismsBothSeatsBothFolds': True, 'missingMechanismSeatsByFold': {'training': [], 'validation': []},
            'physicalExecutionOrStrengthEstablished': False, 'nontrivialSupervisedLabelsByFold': {'training': copy.deepcopy(counts), 'validation': copy.deepcopy(counts)}}}


def request():
    return {'purpose': 'actual-current-source-mentor-imitation-continuation', 'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE,
        'operatorSha256': 'a' * 64, 'run': str(m.RUN), 'dataset': str(DATA_RUN / 'dataset'), 'dataCompletionSha256': 'b' * 64,
        'warmCheckpoint': copy.deepcopy(CP['r4']), 'epochs': 3, 'optimizerSeed': m.SEED, 'learningRate': m.RATE, 'policyAnchor': m.ANCHOR,
        'mechanismShare': m.SHARE, 'budget': m.budget(report()), 'wrapper': {'path': str(m.LAB / 'transfers' / (m.NAME + '-launch.sh')), 'sha256': 'c' * 64},
        'actualGamesAuthorized': 0, 'finalBlindSeedsAuthorized': False}


def views():
    before = {'cudaInitialized': False, 'weights': {key: {'shape': [1], 'sha256': 'd' * 64,
        'adamStep': 100 if key.startswith('value.') else 200, 'expAvgSha256': 'e' * 64, 'expAvgSqSha256': 'f' * 64} for key in PARAMETERS}}
    after = copy.deepcopy(before)
    for key, row in after['weights'].items():
        if not key.startswith('value.'):
            row.update(sha256='1' * 64, adamStep=row['adamStep'] + 64, expAvgSha256='2' * 64)
    return before, after


def teacher_row(family, seat):
    action = {'intent': {'type': family}}
    window = {'kind': 'main', 'observation': {'seat': seat}, 'role': 'learner'}
    if family in ('mainAssembly', 'mainDigiXros'):
        action = {'intent': {'type': 'playCard', 'assembly' if family == 'mainAssembly' else 'digiXros': {}}}
    if family.endswith('Material'):
        action = {'intent': {'type': 'respondDecision', 'decisionId': 'assembly', 'response': {'kind': 'selectCards', 'instanceIds': ['legal-material']}}}
        window['kind'] = 'selectCards'
        if family != 'mainAssemblyMaterial':
            window['request'] = {'options': {'assemblyCardId' if family == 'effectAssemblyMaterial' else 'digiXrosCardId': 'BT26-001'}}
    window['actions'] = [action, {'intent': {'type': 'endTurn'}}]
    return {'window': window, 'action': 0, 'engineTeacherAction': 0, 'supervised': True, 'labelOrigin': 'current-engine-compound-material-teacher'}


class Guards(unittest.TestCase):
    def test_exact_budget_from_original_counts(self):
        actual = m.budget(report())
        self.assertEqual(actual['originalTrainingSamples'], 132)
        self.assertEqual(actual['originalMechanismSamples'], 32)
        self.assertEqual(actual['resampledTrainingSamplesPerEpoch'], 132)
        self.assertEqual(actual['actualAdamUpdatesPerEpoch'], 2)
        self.assertEqual(actual['maximumActualActorAdamUpdates'], 6)

    def test_missing_original_bin_not_invented_by_resampling(self):
        r = report(); r['mechanismCoverage']['nontrivialSupervisedLabelsByFold']['validation'].pop('appFusion:seat1')
        with self.assertRaises(ValueError): m.budget(r)

    def test_data_gaps_old_source_and_fake_updates_rejected(self):
        for key, value in [('all181VisibleBothSeats', False), ('eligibleForMechanismResampling', False), ('sourceCommit', 'old'),
            ('engineSha256', 'wrong'), ('games', 88), ('actualLearningUpdates', True), ('actualLearningUpdates', 1), ('finalBlindSeedsConsumed', True)]:
            r = report(); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.budget(r)

    def test_boolean_sample_counts_rejected(self):
        r = report(); r['mechanismCoverage']['nontrivialSupervisedLabelsByFold']['training']['linkCard:seat0'] = True
        with self.assertRaises(ValueError): m.budget(r)

    def test_pending_completion_and_wrong_learning_scope_rejected(self):
        helper = types.SimpleNamespace(RUN=DATA_RUN, CP=CP)
        m.request_fields(helper, request(), 'a' * 64)
        for key, value in [('dataCompletionSha256', None), ('dataCompletionSha256', 'future'), ('dataset', '/other'), ('actualGamesAuthorized', True),
            ('actualGamesAuthorized', 1), ('epochs', 4), ('learningRate', 3e-4), ('policyAnchor', 0), ('mechanismShare', 0.8), ('finalBlindSeedsAuthorized', True)]:
            r = request(); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.request_fields(helper, r, 'a' * 64)

    def test_real_actor_deltas_preserve_full_value_adam(self):
        before, after = views(); actual = m.tensor_delta(before, after, 64)
        self.assertEqual(actual['selectedActorAdamUpdates'], 64)
        self.assertEqual(actual['optimizerStepDeltas']['value.weight'], 0)
        self.assertEqual(actual['optimizerStepDeltas']['state.0.weight'], 64)
        self.assertFalse(actual['weightChangedByParameter']['value.bias'])

    def test_reset_unequal_delta_and_changed_value_momentum_rejected(self):
        for field, value, key in [('adamStep', 64, 'state.0.weight'), ('adamStep', 265, 'action.0.bias'),
            ('adamStep', 101, 'value.bias'), ('expAvgSha256', '3' * 64, 'value.weight'), ('sha256', '4' * 64, 'value.bias')]:
            before, after = views(); after['weights'][key][field] = value
            with self.subTest(key=key, field=field), self.assertRaises(ValueError): m.tensor_delta(before, after, 64)

    def test_no_actor_weight_change_is_not_learning_proof(self):
        before, after = views()
        for key in PARAMETERS: after['weights'][key]['sha256'] = before['weights'][key]['sha256']
        with self.assertRaises(ValueError): m.tensor_delta(before, after, 64)
        before, after = views()
        with self.assertRaises(ValueError): m.tensor_delta(before, after, True)

    def test_exact_canonical_cli_has_no_game_launch_or_reset(self):
        args = m.cli_args(None, request())
        self.assertEqual(args[args.index('--checkpoint') + 1], CP['r4']['path'])
        self.assertEqual(args[args.index('--device') + 1], 'cuda')
        self.assertEqual(args[args.index('--mechanism-share') + 1], '0.2')
        self.assertNotIn('--compound-only', args); self.assertNotIn('--new-card-columns-only', args)
        self.assertNotIn('--games', args); self.assertNotIn('--allow-runtime-change', args)

    def test_cpu_view_rejects_nonfinite_weight_moment_and_reset_step(self):
        class Tensor:
            dtype = 'float32'
            shape = (1,)
            def __init__(self, value=1, finite=True): self.value = value; self.finite = finite
            def item(self): return self.value
            def contiguous(self): return self
            def numpy(self): return self
            def tobytes(self): return struct.pack('f', self.value)
        class Finite:
            def __init__(self, value): self.value = value
            def all(self): return self
            def item(self): return self.value
        metadata = {'synthetic': True}
        saved = {'metadata': metadata, 'featureVersion': 7, 'games': 3872, 'seed': 6000000,
            'model': {key: Tensor() for key in PARAMETERS},
            'optimizer': {'state': {i: {'step': Tensor(200), 'exp_avg': Tensor(), 'exp_avg_sq': Tensor()} for i in range(12)},
                'param_groups': [{'params': list(range(12)), 'lr': 1e-5}]}}
        fake = types.SimpleNamespace(__version__='2.7.1+cu128', float32='float32', cuda=types.SimpleNamespace(is_initialized=lambda: False),
            load=lambda *a, **k: saved, isfinite=lambda tensor: Finite(tensor.finite))
        helper = types.SimpleNamespace(PARAMETERS=set(PARAMETERS), safe=lambda p: None, digest=lambda p: 'sha')
        with patch.dict(sys.modules, {'torch': fake}):
            self.assertEqual(len(m.checkpoint_view(helper, Path('/synthetic/checkpoint.pt'), metadata)['weights']), 12)
            saved['model']['state.0.weight'].finite = False
            with self.assertRaises(ValueError): m.checkpoint_view(helper, Path('/synthetic/checkpoint.pt'), metadata)
            saved['model']['state.0.weight'].finite = True; saved['optimizer']['state'][0]['exp_avg'].finite = False
            with self.assertRaises(ValueError): m.checkpoint_view(helper, Path('/synthetic/checkpoint.pt'), metadata)
            saved['optimizer']['state'][0]['exp_avg'].finite = True; saved['optimizer']['state'][0]['step'].value = 0
            with self.assertRaises(ValueError): m.checkpoint_view(helper, Path('/synthetic/checkpoint.pt'), metadata)

    def test_pending_data_rejected_before_any_primary_inspection(self):
        r = request(); r['dataCompletionSha256'] = None
        helper = types.SimpleNamespace(RUN=DATA_RUN, CP=CP, pin=lambda *a: None, read=lambda p: r)
        argv = ['synthetic', '--request', '/synthetic/request.json', '--request-sha', 'a' * 64, '--operator-sha', 'a' * 64, '--execute']
        with patch.object(m, 'data_module', return_value=helper), patch.object(sys, 'argv', argv), patch.object(m, 'checkpoint_view') as primary:
            with self.assertRaises(ValueError): m.main()
            primary.assert_not_called()

    def test_engine_only_coverage_excludes_frozen_positive_labels(self):
        import json
        path = operator.parent.parent / 'learning_mechanisms.py'
        if not path.is_file(): path = Path(os.environ['AEGIS_QUALIFIED_LEARNING_MECHANISMS'])
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), 'ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350')
        spec = importlib.util.spec_from_file_location('synthetic_original_mechanism_labels', path)
        labels = importlib.util.module_from_spec(spec); spec.loader.exec_module(labels)
        rows = {}
        bins = [(family, seat) for family in FAMILIES for seat in (0, 1)]
        for fold in ('training', 'validation'):
            indexes = [i for i in range(100) if (i % 5 == 0) == (fold == 'validation')]
            for i, (family, seat) in zip(indexes, bins): rows[i] = teacher_row(family, seat)
        helper = types.SimpleNamespace(RUN=DATA_RUN, safe=lambda p: None, MODULE_SHA={'learning_mechanisms': 'sha'}, load=lambda *a: labels,
            unique=lambda pairs: dict(pairs), invalid=lambda x: self.fail('nonfinite'))
        def content(p, **kwargs):
            i = int(re.fullmatch(r'episode-(\d+).jsonl', p.name).group(1))
            return io.StringIO(json.dumps(rows[i]) + '\n' if i in rows else '')
        with patch.object(Path, 'open', content):
            self.assertTrue(m.teacher_coverage(helper)['allMechanismsBothSeatsBothFolds'])
            # The same positive family remains in the corpus, but its origin is frozen.
            rows[15]['labelOrigin'] = 'frozen-best-qualified-policy'
            with self.assertRaises(ValueError): m.teacher_coverage(helper)


if __name__ == '__main__':
    unittest.main()
