"""Synthetic admission guards only: no primary model, game, replay or GPU launch."""

import copy
import hashlib
import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name('current-mentor-choice-diagnosis.py')
base = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('/private/tmp/aegis-material-teacher-active-goal-20261006/rule-link-current-r4-choice-diagnosis.py')
sys.argv = [sys.argv[0]]
operator = load(source, 'synthetic_mentor_diagnosis')
assert hashlib.sha256(base.read_bytes()).hexdigest() == operator.BASE_SHA
helper = load(base, 'synthetic_unchanged_diagnosis')


def request() -> dict:
    return {'purpose': 'frozen-four-game-mentor-choice-diagnosis', 'sourceCommit': operator.SOURCE,
        'engineSha256': operator.ENGINE, 'operatorSha256': 'a' * 64, 'run': str(operator.run_path()),
        'checkpoints': copy.deepcopy(operator.CHECKPOINTS), 'cells': copy.deepcopy(operator.CELLS),
        'actualGames': 4, 'actualUpdates': 0, 'parentCompletionSha256': 'b' * 64,
        'parentResultSha256': 'c' * 64, 'finalBlindSeedsAuthorized': False,
        'wrapper': {'path': str(Path(operator.LAB) / 'transfers' / (operator.NAME + '-launch.sh')), 'sha256': 'd' * 64}}


def proof() -> dict:
    return {'actualWholeExitCode': 0, 'completionSha256': 'b' * 64, 'report': {
        'sourceCommit': operator.SOURCE, 'engineSha256': operator.ENGINE,
        'checkpoint': copy.deepcopy(operator.CHECKPOINTS['mentor-ppo-r1']),
        'learningCompletionSha256': operator.LEARNING_COMPLETION, 'actualNewLearningUpdates': 6756,
        'actualLearningUpdates': 0, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False,
        'strengthGatePasses': False, 'candidate': {'games': 3872, 'seed': 6135000,
            'byDeck': {f'fixture-{index}': {} for index in range(44)}}}}


class AdmissionGuards(unittest.TestCase):
    def test_exact_four_replays_and_failed_full_origin(self) -> None:
        operator.request_fields(request(), 'a' * 64)
        operator.validate_parent(proof(), request())

    def test_pending_or_partial_file_pins(self) -> None:
        for key in ('parentCompletionSha256', 'parentResultSha256'):
            for value in (None, '', True, 'pending'):
                r = request()
                r[key] = value
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    operator.request_fields(r, 'a' * 64)

    def test_no_new_learning_or_extra_games(self) -> None:
        for key, value in (('actualGames', True), ('actualGames', 8), ('actualUpdates', False), ('actualUpdates', 1),
            ('finalBlindSeedsAuthorized', True)):
            r = request()
            r[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                operator.request_fields(r, 'a' * 64)

    def test_wrong_model_source_or_diagnostic_cell(self) -> None:
        for mutation in ('model', 'source', 'cell', 'extra'):
            r = request()
            if mutation == 'model':
                r['checkpoints']['mentor-ppo-r1']['sha256'] = 'f' * 64
            elif mutation == 'source':
                r['engineSha256'] = 'f' * 64
            elif mutation == 'cell':
                r['cells'][0]['seat'] = 0
            else:
                r['mockFutureSuccess'] = True
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                operator.request_fields(r, 'a' * 64)

    def test_boolean_failed_or_partial_whole(self) -> None:
        for exit_code in (True, 1, 143):
            p = proof()
            p['actualWholeExitCode'] = exit_code
            with self.subTest(exit_code=exit_code), self.assertRaises(ValueError):
                operator.validate_parent(p, request())
        p = proof()
        p['report']['candidate']['games'] = 1672
        with self.assertRaises(ValueError):
            operator.validate_parent(p, request())

    def test_exact_frozen_learning_and_failed_gate(self) -> None:
        for key, value in (('actualNewLearningUpdates', 3900), ('actualLearningUpdates', False),
            ('strengthGatePasses', True), ('learningCompletionSha256', 'f' * 64), ('finalBlindSeedsConsumed', True)):
            p = proof()
            p['report'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                operator.validate_parent(p, request())

    def test_distinct_root_go_exactly_four_games_zero_updates(self) -> None:
        ns = operator.namespace(helper, base.read_text(encoding='utf-8'), request())
        args = SimpleNamespace(request_sha='e' * 64, operator_sha='a' * 64)
        go = {'phase': 'frozen-four-game-mentor-choice-diagnosis', 'requestSha256': args.request_sha,
            'operatorSha256': args.operator_sha, 'sourceReviewed': True, 'resourceAgreed': True,
            'actualGamesAuthorized': 4, 'actualLearningUpdatesAuthorized': 0,
            'maximumConcurrentGameWorkers': 1, 'finalBlindSeedsAuthorized': False}
        ns['approved'](go, args)
        for key, value in (('actualGamesAuthorized', 8), ('actualLearningUpdatesAuthorized', False),
            ('maximumConcurrentGameWorkers', 4), ('phase', 'corrective-ppo-full-all44-evaluation')):
            altered = {**go, key: value}
            with self.subTest(key=key), self.assertRaises(ValueError):
                ns['approved'](altered, args)

    def test_sealed_request_stays_exact(self) -> None:
        r = request()
        ns = operator.namespace(helper, base.read_text(encoding='utf-8'), r)
        changed = {**r, 'parentCompletionSha256': 'e' * 64}
        with self.assertRaises(ValueError):
            ns['request_fields'](changed, 'a' * 64)

    def test_changed_supported_replay_seam_rejected(self) -> None:
        raw = base.read_text(encoding='utf-8').replace("for driver in ('r4', cell['mentor']):",
            "for driver in ('other', cell['mentor']):")
        with self.assertRaises(ValueError):
            operator.namespace(helper, raw, request())

    def test_primary_models_never_imported_by_fixtures(self) -> None:
        self.assertNotIn('torch', sys.modules)


if __name__ == '__main__':
    unittest.main()
