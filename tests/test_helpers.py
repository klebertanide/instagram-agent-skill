"""Regression checks for helper CLIs and their installed skill resources."""

import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = {
    "caption": ROOT / "skills/ig-caption/caption.py",
    "detect": ROOT / "skills/ig-human/detect.py",
    "humanize": ROOT / "skills/ig-human/humanize.py",
    "beats": ROOT / "skills/ig-reel/beats.py",
    "hookscore": ROOT / "skills/ig-reel/hookscore.py",
    "swipe": ROOT / "skills/ig-viral/swipe.py",
}
TSV = ("account\tfollowers\tmedian\tviews\thook\n"
       "@example\t48K\t11,000\t412K\tNobody tells you your first 30 reels flop\n")


def load_helper(name):
    spec = importlib.util.spec_from_file_location("test_" + name, SCRIPTS[name])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class HelperTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cwd = Path(self.temp.name)

    def cli(self, name, *args, text="", script=None, env=None):
        child_env = os.environ.copy()
        child_env.update({
            "HOME": str(self.cwd),
            "USERPROFILE": str(self.cwd),
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
        })
        child_env.update(env or {})
        return subprocess.run(
            [sys.executable, str(script or SCRIPTS[name]), *map(str, args)],
            input=text, text=True, encoding="utf-8", capture_output=True,
            cwd=self.cwd, env=child_env, timeout=10,
        )

    def assert_usage_error(self, result):
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertTrue(result.stderr.strip())

    def test_all_helpers_offer_help_from_another_directory(self):
        for name in SCRIPTS:
            with self.subTest(helper=name):
                result = self.cli(name, "--help")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("usage:", result.stdout)

    def test_copied_skills_keep_json_resources_and_sibling_dependencies(self):
        installed = self.cwd / ".agents/skills"
        shutil.copytree(ROOT / "skills", installed)
        inputs = {
            "caption": "$12 saved my first contract. Save this.",
            "detect": "My client paid $12 for the new contract.",
            "humanize": "We leverage our experience.",
            "beats": "$12 saved my first contract.\nSave this contract.",
            "hookscore": "Stop losing $12 on your first contract",
            "swipe": TSV,
        }
        for name, text in inputs.items():
            with self.subTest(helper=name):
                relative = SCRIPTS[name].relative_to(ROOT / "skills")
                result = self.cli(name, "-", "--json", text=text, script=installed / relative)
                self.assertIn(result.returncode, (0, 1), result.stderr)
                payload = json.loads(result.stdout)
                if name == "swipe":
                    self.assertEqual(payload["reels"][0]["formula_id"], 3)
                    self.assertIsNotNone(payload["reels"][0]["hook_score"])
                    self.assertNotIn("not found", result.stderr)
                elif name == "humanize":
                    self.assertTrue(payload["report"]["lexical"])

    def test_missing_input_is_a_concise_error_for_every_helper(self):
        for name in SCRIPTS:
            with self.subTest(helper=name):
                self.assert_usage_error(self.cli(name, self.cwd / "missing.txt"))

    def test_invalid_utf8_input_is_a_concise_error_for_every_helper(self):
        source = self.cwd / "invalid.txt"
        source.write_bytes(b"\xff")
        for name in SCRIPTS:
            with self.subTest(helper=name):
                self.assert_usage_error(self.cli(name, source))

    def test_invalid_lexicons_are_reported_without_a_traceback(self):
        source = self.cwd / "bad.json"
        for content in ("{", "{}"):
            source.write_text(content, encoding="utf-8")
            for name in ("humanize", "detect"):
                with self.subTest(helper=name, content=content):
                    self.assert_usage_error(self.cli(name, "--lexicon", source,
                                                     text="This is my draft."))

    def test_detect_rejects_reading_stdin_twice(self):
        self.assert_usage_error(self.cli("detect", "-", "-", text="My draft."))

    def test_caption_rejects_nonpositive_truncation(self):
        for cut in ("0", "-1"):
            with self.subTest(cut=cut):
                self.assert_usage_error(self.cli("caption", "--truncate", cut))

    def test_beats_rejects_invalid_rates_and_targets(self):
        for option in ("--wpm", "--target"):
            for value in ("0", "-1", "nan", "inf", "-inf"):
                with self.subTest(option=option, value=value):
                    self.assert_usage_error(self.cli("beats", option + "=" + value))

    def test_beats_library_rejects_invalid_rate(self):
        beats = load_helper("beats")
        for rate in (0, -1, float("nan"), float("inf")):
            with self.subTest(rate=rate), self.assertRaises(ValueError):
                beats.analyse("My first script.", wpm=rate)

    def test_empty_input_is_reported_for_helpers_that_require_records(self):
        for name in ("beats", "hookscore", "swipe"):
            with self.subTest(helper=name):
                self.assert_usage_error(self.cli(name))

    def test_empty_hook_argument_does_not_fall_back_to_stdin(self):
        for hook in ("", " "):
            with self.subTest(hook=hook):
                self.assert_usage_error(self.cli("hookscore", "--hook", hook,
                                                 text="Stop losing $12 on your first contract"))

    def test_frontload_recognizes_names_and_complete_opener_words(self):
        hookscore = load_helper("hookscore")
        score, detail = hookscore.check_frontload("Try Apple")
        self.assertEqual(score, 100)
        self.assertIn("word 2", detail)
        for hook in ("Solo founders lost $5 last week", "Hire 2 people instead of quitting"):
            with self.subTest(hook=hook):
                score, detail = hookscore.check_frontload(hook)
                self.assertEqual(score, 100)
                self.assertNotIn("weak opener", detail)
        self.assertIn("weak opener", hookscore.check_frontload("So I lost $5")[1])

    def test_swipe_accepts_displayed_counts_without_dropping_magnitudes(self):
        swipe = load_helper("swipe")
        counts = {"12,345": 12345, "1.2K": 1200, "3M": 3000000,
                  "2.5 b": 2500000000, "100": 100, "": None,
                  "-5": None, "1.2": None, "not a count": None}
        for value, expected in counts.items():
            with self.subTest(value=value):
                self.assertEqual(swipe.parse_count(value), expected)
        payload = json.loads(self.cli("swipe", "--json", text=TSV).stdout)
        self.assertEqual(payload["reels"][0]["views"], 412000)
        self.assertEqual(payload["reels"][0]["outlier"], 37.45)

    def test_swipe_labels_mixed_and_unavailable_baselines(self):
        swipe = load_helper("swipe")
        rows = [
            {"views": 100, "median": 10, "followers": 50, "hook": "my first 10"},
            {"views": 100, "median": None, "followers": 50, "hook": "my first 10"},
            {"views": 100, "median": None, "followers": None, "hook": "my first 10"},
        ]
        payload = swipe.analyse(rows, None)
        self.assertEqual(payload["baseline"], "mixed baselines")
        self.assertEqual(payload["baseline_counts"],
                         {"account median": 1, "follower count": 1, "unavailable": 1})
        missing = payload["reels"][-1]
        self.assertEqual(missing["baseline_source"], "unavailable")
        self.assertIsNone(missing["outlier"])

    def test_invalid_hook_formulas_are_reported(self):
        path = self.cwd / "bad-hooks.json"
        for content in ("{", "{}", '{"hooks": [{"id": 1, "name": "bad", "match": "["}]}'):
            path.write_text(content, encoding="utf-8")
            with self.subTest(content=content):
                self.assert_usage_error(self.cli("swipe", "--hooks", path, text=TSV))

    def test_standalone_swipe_keeps_optional_dependencies_optional(self):
        standalone = self.cwd / "standalone/swipe.py"
        standalone.parent.mkdir()
        shutil.copy2(SCRIPTS["swipe"], standalone)
        result = self.cli("swipe", "--json", text=TSV, script=standalone)
        self.assertEqual(result.returncode, 0, result.stderr)
        row = json.loads(result.stdout)["reels"][0]
        self.assertIsNone(row["hook_score"])
        self.assertIsNone(row["formula_id"])
        self.assertIn("note:", result.stderr)

    def test_standalone_swipe_does_not_import_an_unrelated_hookscore(self):
        standalone = self.cwd / "swipe.py"
        shutil.copy2(SCRIPTS["swipe"], standalone)
        (self.cwd / "hookscore.py").write_text("raise RuntimeError('unrelated scorer')\n",
                                                encoding="utf-8")
        result = self.cli("swipe", "--json", text=TSV, script=standalone)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNone(json.loads(result.stdout)["reels"][0]["hook_score"])

    def test_relative_and_nested_output_paths_work(self):
        for name, text, suffix in (("swipe", TSV, ".md"), ("humanize", "My draft.", ".txt")):
            for relative in (name + suffix, "nested/" + name + suffix):
                with self.subTest(helper=name, path=relative):
                    result = self.cli(name, "--out", relative, text=text)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertTrue((self.cwd / relative).is_file())
                    self.assertTrue((self.cwd / relative).read_text(encoding="utf-8"))

    def test_output_file_errors_are_reported_without_a_traceback(self):
        for name, text in (("swipe", TSV), ("humanize", "My draft.")):
            with self.subTest(helper=name):
                self.assert_usage_error(self.cli(name, "--out", self.cwd, text=text))

    def test_humanize_expands_home_in_output_path(self):
        env = {"HOME": str(self.cwd), "USERPROFILE": str(self.cwd)}
        result = self.cli("humanize", "--out", "~/drafts/clean.txt", text="My draft.", env=env)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.cwd / "drafts/clean.txt").read_text(encoding="utf-8"), "My draft.\n")

    def test_humanize_preserves_joined_emoji_and_non_english_writing(self):
        text = "👩\u200d💻 می\u200cروم\n"
        result = self.cli("humanize", text=text)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, text)
        score, detail = load_helper("detect").check_fingerprint(text)
        self.assertEqual(score, 100)
        self.assertIn("0 invisible", detail)
        stripped = self.cli("humanize", "--strip-joiners", text=text)
        self.assertEqual(stripped.stdout, text.replace("\u200d", "").replace("\u200c", ""))

    def test_humanize_removes_zero_width_space_but_preserves_urls(self):
        text = "We\u200b leverage https://example.com/leverage — it works."
        result = self.cli("humanize", "--json", text=text)
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertNotIn("\u200b", payload["text"])
        self.assertIn("https://example.com/leverage", payload["text"])
        self.assertTrue(payload["report"]["invisible"])
        self.assertTrue(payload["report"]["lexical"])

    def test_every_cli_uses_utf8_pipes_even_with_an_ansi_environment(self):
        child_env = dict(os.environ, HOME=str(self.cwd), USERPROFILE=str(self.cwd),
                         PYTHONUTF8="0", PYTHONIOENCODING="cp1252")
        unicode_text = "👩\u200d💻 می\u200cروم My first $12 contract. Save this.\n"
        for name in SCRIPTS:
            source = TSV.replace("@example", "@éxample").replace("Nobody", "👩\u200d💻 می\u200cروم Nobody") if name == "swipe" else unicode_text
            for json_output in (False, True):
                with self.subTest(helper=name, json=json_output):
                    command = [sys.executable, str(SCRIPTS[name]), "-"]
                    if json_output:
                        command.append("--json")
                    result = subprocess.run(command, input=source.encode("utf-8"),
                                            capture_output=True, cwd=self.cwd,
                                            env=child_env, timeout=10)
                    stderr = result.stderr.decode("utf-8")
                    self.assertIn(result.returncode, (0, 1), stderr)
                    stdout = result.stdout.decode("utf-8")
                    self.assertTrue(stdout)
                    if json_output:
                        payload = json.loads(stdout)
                        if name == "swipe":
                            self.assertEqual(payload["reels"][0]["account"], "@éxample")
                        elif name == "humanize":
                            self.assertIn("👩\u200d💻 می\u200cروم", payload["text"])
                        elif name == "caption":
                            self.assertIn("👩\u200d💻 می\u200cروم", payload["visible"])
                        elif name == "beats":
                            self.assertEqual(payload["beats"][0]["text"], unicode_text.strip())
                        elif name == "hookscore":
                            self.assertEqual(payload["hook"], unicode_text.strip())

    def test_cli_stderr_uses_utf8_even_with_an_ansi_environment(self):
        output = self.cwd / "résumé/clean.txt"
        result = self.cli("humanize", "--out", output, text="My draft.",
                          env={"PYTHONUTF8": "0", "PYTHONIOENCODING": "cp1252"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("résumé", result.stderr)


if __name__ == "__main__":
    unittest.main()
