"""Exercise real temporary Git trees so protection failures are observable."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'check_test_baseline.py'
spec = importlib.util.spec_from_file_location('baseline_guard', SCRIPT)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class BaselineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'synthetic@example.invalid')
        self.git('config', 'user.name', 'Synthetic test')
        (self.root / 'tests').mkdir()
        (self.root / 'tests/case.txt').write_text('approved expectation')
        (self.root / 'app.txt').write_text('initial implementation')
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic approved baseline')
        self.commit = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()

    def test_unchanged_baseline_and_unrelated_implementation_pass(self):
        (self.root / 'app.txt').write_text('new implementation')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], [])

    def test_unstaged_expectation_change_detected(self):
        (self.root / 'tests/case.txt').write_text('weakened expectation')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], ['tests/case.txt'])

    def test_staged_deletion_detected(self):
        self.git('rm', '-q', 'tests/case.txt')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], ['tests/case.txt'])

    def test_committed_change_after_baseline_detected(self):
        (self.root / 'tests/case.txt').write_text('different expectation')
        self.git('add', '.')
        self.git('commit', '-qm', 'Change expectation')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], ['tests/case.txt'])

    def test_staged_change_hidden_by_restored_worktree_detected(self):
        (self.root / 'tests/case.txt').write_text('weakened staged expectation')
        self.git('add', '.')
        (self.root / 'tests/case.txt').write_text('approved expectation')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], ['tests/case.txt'])

    def test_symbolic_and_abbreviated_baselines_rejected(self):
        for baseline in ['HEAD', self.commit[:8]]:
            with self.subTest(baseline=baseline), self.assertRaises(ValueError):
                guard.check(self.root, baseline, ['tests'])

    def test_untracked_test_detected(self):
        (self.root / 'tests/new.txt').write_text('new test')
        self.assertEqual(guard.check(self.root, self.commit, ['tests'])[1], ['tests/new.txt'])

    def test_invalid_baseline_and_missing_paths_rejected(self):
        with self.assertRaises(ValueError):
            guard.check(self.root, 'not-a-real-commit', ['tests'])
        with self.assertRaises(ValueError):
            guard.check(self.root, self.commit, ['missing'])

    def test_outside_or_magic_paths_rejected(self):
        for path in ['../tests', '/tests', 'C:/tests', ':(exclude)tests', '']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                guard.check(self.root, self.commit, [path])


if __name__ == '__main__':
    unittest.main()
