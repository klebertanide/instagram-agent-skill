"""Installer integration tests: every invocation uses an isolated HOME and cwd."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY = Path(__file__).resolve().parents[1]
INSTALLER = REPOSITORY / "scripts" / "install.py"
SKILLS = sorted(path.name for path in (REPOSITORY / "skills").iterdir() if (path / "SKILL.md").is_file())


class InstallerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.home = self.root / "home"
        self.home.mkdir()
        self.cwd = self.root / "unrelated-directory"
        self.cwd.mkdir()
        self.environment = dict(
            os.environ, HOME=str(self.home), USERPROFILE=str(self.home), PYTHONUTF8="1",
        )
        self.environment.pop("INSTAGRAM_AGENT_HOME", None)
        self.skills_dir = self.home / ".agents" / "skills"
        self.data_dir = self.home / ".agents" / "instagram"

    def run_install(self, *arguments: str, success: bool = True) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            [sys.executable, str(INSTALLER), *map(str, arguments)],
            cwd=self.cwd, env=self.environment, text=True, encoding="utf-8", capture_output=True,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def check_installation(self, skills_dir: Path, data_dir: Path) -> None:
        self.assertEqual(sorted(path.name for path in skills_dir.iterdir()), SKILLS)
        self.assertEqual(len(SKILLS), 13)
        for name in SKILLS:
            self.assertTrue((skills_dir / name / "SKILL.md").is_file())
            config = json.loads((skills_dir / name / "instagram-config.json").read_text())
            self.assertEqual(config, {"data_dir": str(data_dir)})
            self.assertFalse(any((skills_dir / name).rglob("__pycache__")))
        self.assertTrue((data_dir / "voice.md").is_file())
        # ig-viral imports ig-reel tools from its sibling directory.
        self.assertTrue((skills_dir / "ig-viral" / "swipe.py").is_file())
        self.assertTrue((skills_dir / "ig-reel" / "hookscore.py").is_file())
        self.assertTrue((skills_dir / "ig-reel" / "hooks.json").is_file())

    def test_codex_default_and_unrelated_cwd(self) -> None:
        result = self.run_install()
        self.check_installation(self.skills_dir, self.data_dir)
        self.assertIn("$ig-reel", result.stdout)
        self.assertFalse((self.home / ".claude").exists())

    def test_installed_viral_can_read_and_import_its_reel_sibling(self) -> None:
        self.run_install()
        result = subprocess.run(
            [sys.executable, str(self.skills_dir / "ig-viral" / "swipe.py"), "--json"],
            input="account\tmedian\tviews\thook\n@creator\t1000\t20000\tNobody tells you your first 30 reels will flop.\n",
            cwd=self.cwd, env=self.environment, text=True, encoding="utf-8", capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        reel = json.loads(result.stdout)["reels"][0]
        self.assertIsNotNone(reel["hook_score"])
        self.assertEqual(reel["formula_id"], 3)

    def test_skill_copy_preserves_assets_and_excludes_caches_and_source_symlinks(self) -> None:
        spec = importlib.util.spec_from_file_location("instagram_install", INSTALLER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        source = self.root / "fixture" / "skills" / "example"
        source.mkdir(parents=True)
        (source / "SKILL.md").write_text("---\nname: example\ndescription: An example skill.\n---\nInstructions.\n")
        (source / "tool.py").write_text("print('tool')\n")
        (source / "data.json").write_text("{}\n")
        (source / "agents").mkdir()
        (source / "agents" / "openai.yaml").write_text("interface:\n  display_name: Example\n")
        (source / "__pycache__").mkdir()
        (source / "__pycache__" / "tool.pyc").write_bytes(b"cache")
        (source / ".private").write_text("exclude")
        (source / "orphan.pyc").write_bytes(b"cache")
        try:
            (source / "external.md").symlink_to(self.root / "unrelated-private-file.md")
        except (NotImplementedError, OSError):
            # Windows commonly requires a privilege unavailable in CI. The
            # asset/cache checks below still run when symlinks are unavailable.
            pass
        module.install([source], self.skills_dir, self.data_dir, [])
        installed = self.skills_dir / "example"
        self.assertTrue((installed / "tool.py").is_file())
        self.assertTrue((installed / "data.json").is_file())
        self.assertTrue((installed / "agents" / "openai.yaml").is_file())
        self.assertFalse((installed / "__pycache__").exists())
        self.assertFalse((installed / ".private").exists())
        self.assertFalse((installed / "orphan.pyc").exists())
        self.assertFalse((installed / "external.md").is_symlink())

    def test_claude_global(self) -> None:
        result = self.run_install("--agent", "claude")
        self.check_installation(self.home / ".claude" / "skills", self.home / ".claude" / "instagram")
        self.assertIn("/ig-reel", result.stdout)

    def test_project_paths_for_both_agents(self) -> None:
        for agent, directory in (("codex", ".agents"), ("claude", ".claude")):
            with self.subTest(agent=agent):
                project = self.root / f"{agent} project"
                self.run_install("--agent", agent, "--project", project)
                self.check_installation(project / directory / "skills", project / ".instagram")
        self.assertFalse((self.home / ".agents").exists())
        self.assertFalse((self.home / ".claude").exists())

    def test_custom_paths(self) -> None:
        skills_dir, data_dir = self.root / "my skills", self.root / "my profiles"
        self.run_install("--skills-dir", skills_dir, "--data-dir", data_dir)
        self.check_installation(skills_dir, data_dir)

    def test_unicode_profile_and_output_with_legacy_stdio_encoding(self) -> None:
        data_dir = self.root / "perfil-测试"
        environment = dict(self.environment, PYTHONUTF8="0", PYTHONIOENCODING="cp1252")
        result = subprocess.run(
            [sys.executable, str(INSTALLER), "--data-dir", str(data_dir)],
            cwd=self.cwd, env=environment, capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8"))
        self.assertIn(str(data_dir), result.stdout.decode("utf-8"))
        self.check_installation(self.skills_dir, data_dir)

    def test_environment_default_and_explicit_data_override(self) -> None:
        env_data = self.root / "environment profile"
        self.environment["INSTAGRAM_AGENT_HOME"] = str(env_data)
        self.run_install()
        self.check_installation(self.skills_dir, env_data)
        self.assertFalse(self.data_dir.exists())
        explicit_data = self.root / "explicit profile"
        self.run_install("--force", "--data-dir", explicit_data)
        self.check_installation(self.skills_dir, explicit_data)
        self.assertTrue((env_data / "voice.md").is_file())

    def create_symlink(self, link: Path, target: Path, is_directory: bool = False) -> None:
        try:
            link.symlink_to(target, target_is_directory=is_directory)
        except (NotImplementedError, OSError) as error:
            self.skipTest(f"Symlink creation is unavailable on this platform: {error}")

    def test_collision_refuses_whole_batch_without_modifying_data(self) -> None:
        collision = self.skills_dir / SKILLS[-1]
        collision.mkdir(parents=True)
        marker = collision / "my-file.md"
        marker.write_text("keep me")
        result = self.run_install(success=False)
        self.assertIn("--force", result.stderr)
        self.assertEqual(list(self.skills_dir.iterdir()), [collision])
        self.assertEqual(marker.read_text(), "keep me")
        self.assertFalse(self.data_dir.exists())

    def test_force_replaces_skills_and_preserves_all_existing_data(self) -> None:
        self.run_install()
        marker = self.skills_dir / SKILLS[0] / "obsolete.txt"
        marker.write_text("old")
        voice = self.data_dir / "voice.md"
        voice.write_text("my voice")
        history = self.data_dir / "swipe.md"
        history.write_text("my evidence")
        self.run_install("--force")
        self.assertFalse(marker.exists())
        self.assertEqual(voice.read_text(), "my voice")
        self.assertEqual(history.read_text(), "my evidence")

    def test_force_keeps_the_configured_custom_profile(self) -> None:
        custom_data = self.root / "custom profile"
        self.run_install("--data-dir", custom_data)
        voice = custom_data / "voice.md"
        voice.write_text("my custom voice")
        dry_run = self.run_install("--force", "--dry-run")
        self.assertIn(f"Preserve existing data: {voice}", dry_run.stdout)
        self.assertFalse(self.data_dir.exists())
        self.run_install("--force")
        self.check_installation(self.skills_dir, custom_data)
        self.assertEqual(voice.read_text(), "my custom voice")
        self.assertFalse(self.data_dir.exists())

    def test_force_refuses_conflicting_profiles_before_any_changes(self) -> None:
        self.run_install()
        marker = self.skills_dir / SKILLS[0] / "keep.txt"
        marker.write_text("installed version")
        conflicting_profile = self.root / "conflicting profile"
        config = self.skills_dir / SKILLS[-1] / "instagram-config.json"
        original_config = json.dumps({"data_dir": str(conflicting_profile)})
        config.write_text(original_config)
        result = self.run_install("--force", success=False)
        self.assertIn("conflicting", result.stderr)
        self.assertIn("--data-dir", result.stderr)
        self.assertEqual(config.read_text(), original_config)
        self.assertEqual(marker.read_text(), "installed version")
        self.assertFalse(conflicting_profile.exists())
        # An explicit profile resolves the ambiguity without deleting old data.
        self.run_install("--force", "--data-dir", self.data_dir)
        self.check_installation(self.skills_dir, self.data_dir)

    def test_force_refuses_invalid_installed_config_before_any_changes(self) -> None:
        self.run_install()
        marker = self.skills_dir / SKILLS[0] / "keep.txt"
        marker.write_text("installed version")
        config = self.skills_dir / SKILLS[-1] / "instagram-config.json"
        for content in ("invalid json", "{}", "[]", '{"data_dir": "relative/path"}', '{"data_dir": 42}'):
            with self.subTest(content=content):
                config.write_text(content)
                result = self.run_install("--force", success=False)
                self.assertIn("Invalid installed configuration", result.stderr)
                self.assertIn("--data-dir", result.stderr)
                self.assertEqual(config.read_text(), content)
                self.assertEqual(marker.read_text(), "installed version")

    def test_force_refuses_symlink_without_touching_target(self) -> None:
        external = self.root / "external skill"
        external.mkdir()
        marker = external / "important.txt"
        marker.write_text("untouched")
        self.skills_dir.mkdir(parents=True)
        collision = self.skills_dir / SKILLS[-1]
        self.create_symlink(collision, external, is_directory=True)
        result = self.run_install("--force", success=False)
        self.assertIn("symlink", result.stderr)
        self.assertEqual(marker.read_text(), "untouched")
        self.assertTrue(collision.is_symlink())
        self.assertEqual(list(self.skills_dir.iterdir()), [collision])
        self.assertFalse(self.data_dir.exists())

    def test_broken_skill_symlink_is_a_collision(self) -> None:
        self.skills_dir.mkdir(parents=True)
        collision = self.skills_dir / SKILLS[-1]
        self.create_symlink(collision, self.root / "missing", is_directory=True)
        self.run_install("--force", success=False)
        self.assertTrue(collision.is_symlink())

    def test_existing_voice_symlink_and_broken_symlink_are_preserved(self) -> None:
        for broken in (False, True):
            with self.subTest(broken=broken):
                skills_dir = self.root / f"skills-{broken}"
                data_dir = self.root / f"data-{broken}"
                data_dir.mkdir()
                external = self.root / f"voice-{broken}.md"
                if not broken:
                    external.write_text("original voice")
                voice = data_dir / "voice.md"
                self.create_symlink(voice, external)
                self.run_install("--skills-dir", skills_dir, "--data-dir", data_dir)
                self.assertTrue(voice.is_symlink())
                if not broken:
                    self.assertEqual(external.read_text(), "original voice")
                else:
                    self.assertFalse(external.exists())

    def test_dry_run_creates_nothing(self) -> None:
        project = self.root / "not created"
        result = self.run_install("--project", project, "--dry-run")
        self.assertIn("13 skills", result.stdout)
        self.assertIn("No files were changed", result.stdout)
        self.assertFalse(project.exists())
        self.assertEqual(list(self.home.iterdir()), [])

    def test_migration_uses_legacy_voice_and_preserves_sources_and_destinations(self) -> None:
        legacy = self.home / ".claude" / "instagram"
        legacy.mkdir(parents=True)
        (legacy / "voice.md").write_text("legacy voice")
        (legacy / "swipe.md").write_text("legacy swipe")
        (legacy / "plan.md").write_text("legacy plan")
        (legacy / "secret.json").write_text("do not migrate")
        self.data_dir.mkdir(parents=True)
        (self.data_dir / "plan.md").write_text("newer plan")
        self.run_install("--migrate-claude")
        self.assertEqual((self.data_dir / "voice.md").read_text(), "legacy voice")
        self.assertEqual((self.data_dir / "swipe.md").read_text(), "legacy swipe")
        self.assertEqual((self.data_dir / "plan.md").read_text(), "newer plan")
        self.assertFalse((self.data_dir / "secret.json").exists())
        self.assertEqual((legacy / "voice.md").read_text(), "legacy voice")
        self.assertEqual((legacy / "swipe.md").read_text(), "legacy swipe")
        self.assertEqual((legacy / "plan.md").read_text(), "legacy plan")

    def test_migration_preserves_existing_voice(self) -> None:
        legacy = self.home / ".claude" / "instagram"
        legacy.mkdir(parents=True)
        (legacy / "voice.md").write_text("legacy voice")
        self.data_dir.mkdir(parents=True)
        (self.data_dir / "voice.md").write_text("current voice")
        self.run_install("--migrate-claude")
        self.assertEqual((self.data_dir / "voice.md").read_text(), "current voice")

    def test_invalid_data_directory_does_not_install_any_skills(self) -> None:
        invalid = self.root / "not-a-directory"
        invalid.write_text("preserve")
        self.run_install("--data-dir", invalid / "profiles", success=False)
        self.assertFalse(self.skills_dir.exists())
        self.assertEqual(invalid.read_text(), "preserve")

    def test_data_inside_a_skill_is_rejected(self) -> None:
        self.run_install("--data-dir", self.skills_dir / "ig-reel" / "data", success=False)
        self.assertFalse(self.skills_dir.exists())

    def test_source_directory_cannot_be_install_destination(self) -> None:
        result = self.run_install("--skills-dir", REPOSITORY / "skills", "--force", success=False)
        self.assertIn("source skills", result.stderr)

    def test_rolls_back_replaced_skills_if_data_copy_fails(self) -> None:
        spec = importlib.util.spec_from_file_location("instagram_install", INSTALLER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.run_install()
        marker = self.skills_dir / "ig-reel" / "keep.txt"
        marker.write_text("old installed version")
        voice = self.data_dir / "voice.md"
        voice.unlink()
        skills = module.discover_skills(REPOSITORY / "skills")
        with mock.patch.object(module, "copy_new_file", side_effect=OSError("simulated write failure")):
            with self.assertRaisesRegex(OSError, "simulated write failure"):
                module.install(
                    skills, self.skills_dir, self.data_dir,
                    [(REPOSITORY / "templates" / "voice.md", voice)], force=True,
                )
        self.assertEqual(marker.read_text(), "old installed version")
        self.assertFalse(voice.exists())
        self.assertEqual(sorted(path.name for path in self.skills_dir.iterdir()), SKILLS)


if __name__ == "__main__":
    unittest.main()
