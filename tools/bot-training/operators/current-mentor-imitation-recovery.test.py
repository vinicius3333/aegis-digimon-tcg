"""Synthetic custody/CPU-isolation guards; no real models, games or recovery launched."""

import argparse
import copy
import importlib.util
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

path = Path(os.environ.get('AEGIS_MENTOR_RECOVERY_OPERATOR', Path(__file__).with_name('current-mentor-imitation-recovery.py')))
spec = importlib.util.spec_from_file_location('synthetic_recovery_guards', path)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class ProcFixture:
    def __init__(self, argv, ticks='200', state='S'):
        self.argv = argv; self.ticks = ticks; self.state = state

    def __truediv__(self, name):
        return self

    def is_file(self):
        return True

    def read_text(self, **kwargs):
        fields = [self.state, '100'] + ['0'] * 17 + [self.ticks]
        return '123 (synthetic-only) ' + ' '.join(fields)

    def read_bytes(self):
        return b'\0'.join(x.encode() for x in self.argv) + b'\0'


class Guards(unittest.TestCase):
    def setUp(self):
        self.r = {'purpose': 'actual-cpu-only-mentor-imitation-custody-recovery', 'operatorSha256': 'a' * 64,
            'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'run': str(m.RUN), 'checkpoint': m.CHECKPOINT,
            'originalWholeExitCode': 1, 'failedOutputMap': {'path': str(m.LAB / 'transfers' / (m.ORIGINAL_NAME + '-failed-output-map.json')), 'sha256': m.FAILED_MAP_SHA},
            'wrapper': {'path': str(m.LAB / 'transfers' / (m.NAME + '-launch.sh')), 'sha256': 'b' * 64},
            'actualGamesAuthorized': 0, 'actualLearningUpdatesAuthorized': 0, 'finalBlindSeedsAuthorized': False}
        self.a = argparse.Namespace(request=Path('/synthetic/request.json'), request_sha='c' * 64,
            operator_sha='a' * 64, identity_sha='d' * 64, go_sha='e' * 64, parent_ticks='200', execute=False, closed=False, closed_audit=False)
        self.native = {'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'checkpoint': m.CHECKPOINT,
            'actualNewGames': 0, 'selectedEpoch': 3, 'selectedLearning': {'selectedActorAdamUpdates': 3900, 'all12Finite': True},
            'wholeTrainingLearning': {'selectedActorAdamUpdates': 3900}, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}

    def test_original_failure_cannot_be_relabelled_zero(self):
        for code in (0, True, 143):
            r = copy.deepcopy(self.r); r['originalWholeExitCode'] = code
            with self.subTest(code=code), self.assertRaises(ValueError): m.request_fields(r, self.a.operator_sha)

    def test_no_games_updates_or_final_seeds(self):
        for key, value in [('actualGamesAuthorized', 1), ('actualLearningUpdatesAuthorized', 1),
            ('actualGamesAuthorized', False), ('finalBlindSeedsAuthorized', 0), ('finalBlindSeedsAuthorized', True)]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.request_fields(r, self.a.operator_sha)

    def test_wrong_checkpoint_map_source_or_fp_rejected(self):
        for key, value in [('checkpoint', {'path': m.CHECKPOINT['path'], 'sha256': 'f' * 64}),
            ('failedOutputMap', {'path': self.r['failedOutputMap']['path'], 'sha256': 'f' * 64}),
            ('sourceCommit', 'wrong'), ('engineSha256', 'f' * 64)]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.request_fields(r, self.a.operator_sha)

    def test_native_qualified_positive3900_selected_three_required(self):
        m.validate_native(self.native)
        for key, value in [('selectedEpoch', 0), ('selectedEpoch', 2), ('actualNewGames', False),
            ('acceptedStrengthOrMastery', True)]:
            r = copy.deepcopy(self.native); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.validate_native(r)

    def test_partial_steps_or_nonfinite_claim_rejected(self):
        for key, value in [('selectedActorAdamUpdates', 2600), ('all12Finite', False)]:
            r = copy.deepcopy(self.native); r['selectedLearning'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.validate_native(r)

    def test_cpu_primary_inspection_runs_in_separate_process(self):
        fixture = ProcFixture([])
        def paths(*args):
            return fixture if args[0] == '/proc' else Path(*args)
        before = set(sys.modules)
        fake = SimpleNamespace(unique=lambda rows: dict(rows), invalid=lambda value: self.fail('nonfinite'))
        with patch.object(m, 'Path', side_effect=paths), patch.object(m.subprocess, 'run',
            return_value=subprocess.CompletedProcess([], 0, json.dumps(self.native), '')) as run:
            report, receipt = m.inspect_cpu(None, fake, self.r, self.a)
            argv = run.call_args.args[0]
            self.assertIn('--cpu-audit', argv); self.assertNotIn('--execute', argv)
            self.assertEqual(receipt['exitCode'], 0); self.assertEqual(report, self.native)
        self.assertEqual('torch' in before, 'torch' in sys.modules)

    def test_cpu_child_failure_never_becomes_success(self):
        fixture = ProcFixture([])
        def paths(*args):
            return fixture if args[0] == '/proc' else Path(*args)
        with patch.object(m, 'Path', side_effect=paths), patch.object(m.subprocess, 'run',
            side_effect=subprocess.CalledProcessError(1, ['synthetic-only'])):
            with self.assertRaises(subprocess.CalledProcessError): m.inspect_cpu(None, None, self.r, self.a)

    def test_reused_pid_ticks_are_distinct_from_old_process(self):
        with patch.object(m, 'Path', return_value=ProcFixture([], ticks='201')):
            self.assertFalse(m.process_same(123, '200'))
        with patch.object(m, 'Path', return_value=ProcFixture([], ticks='200', state='Z')):
            self.assertTrue(m.process_same(123, '200'))  # Existing original zombie is not gone.

    def test_idle_check_before_cpu_torch_import_and_not_after(self):
        fixture = ProcFixture(['python', str(m.__file__), '--execute', self.a.request_sha, self.a.operator_sha])
        def paths(*args):
            return fixture if args[0] == '/proc' else Path(*args)
        def idle():
            self.assertNotIn('torch', sys.modules)
        before = {'metadata': {'syntheticOnly': True}}
        def model_view(*args):
            sys.modules['torch'] = SimpleNamespace(syntheticOnly=True)
            return before
        s = SimpleNamespace(RUN=Path('/synthetic/original'), checkpoint_view=model_view, output_report=lambda *args: self.native)
        fake = SimpleNamespace(idle=idle, read=lambda path: before)
        with (
            patch.dict(sys.modules, {}, clear=False),
            patch.object(m, 'Path', side_effect=paths),
            patch.object(m, 'whole'),
            patch.object(m, 'snapshot', return_value={'warmCheckpoint': m.CHECKPOINT}),
        ):
            self.assertEqual(m.cpu_audit(s, fake, self.r, self.a), self.native)

    def test_spoofed_cpu_parent_mode_or_ticks_rejected_before_models(self):
        for argv, ticks in [(['python', str(m.__file__), '--cpu-audit'], '200'),
            (['python', str(m.__file__), '--execute', self.a.request_sha, self.a.operator_sha], '201')]:
            fixture = ProcFixture(argv, ticks=ticks)
            def paths(*args):
                return fixture if args[0] == '/proc' else Path(*args)
            with self.subTest(ticks=ticks), patch.object(m, 'Path', side_effect=paths), self.assertRaises(ValueError):
                m.cpu_audit(None, None, self.r, self.a)

    def test_source_runtime_hash_changes_fail_closed(self):
        s = SimpleNamespace(modules=lambda _: {})
        fake = SimpleNamespace(MANIFEST=Path('/synthetic/manifest.json'), CHECKOUT=Path('/synthetic/checkout'),
            read=lambda _: {'files': {'apps/api/src/card.ts': 'a' * 64}},
            pin=lambda *args: (_ for _ in ()).throw(ValueError('synthetic changed source')))
        with self.assertRaises(ValueError): m.runtime_guard(s, fake)

    def test_boolean_cpu_go_flags_and_counts_rejected(self):
        go = {'phase': self.r['purpose'], 'requestSha256': self.a.request_sha, 'operatorSha256': self.a.operator_sha,
            'sourceReviewed': True, 'resourceAgreed': True, 'cpuOnly': True, 'actualGamesAuthorized': 0,
            'actualLearningUpdatesAuthorized': 0, 'finalBlindSeedsAuthorized': False}
        fake = SimpleNamespace(pin=lambda *args: None, read=lambda path: go)
        m.approved(fake, self.r, self.a)
        go['actualLearningUpdatesAuthorized'] = False
        with self.assertRaises(ValueError): m.approved(fake, self.r, self.a)


if __name__ == '__main__':
    unittest.main()
