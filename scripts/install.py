#!/usr/bin/env python3
"""Install the Instagram skills and initialize their persistent data directory.

Requires Python 3.10 or newer and no third-party packages. The repository can
live anywhere; every source path is relative to this script, not the shell's
working directory.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile


REPOSITORY = Path(__file__).resolve().parents[1]
IGNORED_DIRECTORIES = {
    "__pycache__", "node_modules", ".git", ".pytest_cache", ".mypy_cache",
    ".ruff_cache", ".venv", "venv",
}


class InstallError(Exception):
    """A preflight or installation error that can be explained to the user."""


def absolute_path(value: str | Path) -> Path:
    return Path(os.path.abspath(Path(value).expanduser()))


def exists(path: Path) -> bool:
    """Broken symlinks are existing paths too."""
    return path.exists() or path.is_symlink()


def validate_directory(path: Path) -> None:
    """Check existing ancestors before creating any installation directories."""
    for candidate in (path, *path.parents):
        if exists(candidate) and not candidate.is_dir():
            raise InstallError(f"Expected a directory, but found another path: {candidate}")


def discover_skills(source: Path) -> list[Path]:
    if not source.is_dir():
        raise InstallError(f"Skills directory is missing: {source}")
    skills = sorted(
        path for path in source.iterdir()
        if path.is_dir() and not path.name.startswith(".") and path.name not in IGNORED_DIRECTORIES
    )
    if not skills:
        raise InstallError(f"No skills found in {source}")
    for skill in skills:
        if skill.is_symlink():
            raise InstallError(f"Skill source cannot be a symlink: {skill}")
        metadata = skill / "SKILL.md"
        if not metadata.is_file() or metadata.is_symlink():
            raise InstallError(f"Missing regular SKILL.md in {skill}")
        lines = metadata.read_text(encoding="utf-8").splitlines()
        if not lines or lines[0].strip() != "---":
            raise InstallError(f"Missing YAML frontmatter in {metadata}")
        try:
            end = next(index for index, line in enumerate(lines[1:], 1) if line.strip() == "---")
        except StopIteration:
            raise InstallError(f"Unclosed YAML frontmatter in {metadata}") from None
        frontmatter = "\n".join(lines[1:end])
        name_match = re.search(r"^name:\s*([^\n]+)$", frontmatter, re.MULTILINE)
        if not name_match or name_match.group(1).strip().strip("\"'") != skill.name:
            raise InstallError(f"Skill name must match its directory ({skill.name}): {metadata}")
        # This is a lightweight frontmatter check, not a YAML parser. Folded
        # descriptions and ordinary quoted/unquoted scalar descriptions work.
        description = re.search(
            r"^description:\s*(.*?)(?=\n[^\s]|\Z)", frontmatter, re.MULTILINE | re.DOTALL,
        )
        if not description or not description.group(1).strip().strip("\"'|>+- "):
            raise InstallError(f"Missing description in {metadata}")
    return skills


def ignore_assets(directory: str, names: list[str]) -> set[str]:
    """Only copy the published assets, never caches or external symlink data."""
    return {
        name for name in names
        if name.startswith(".") or name in IGNORED_DIRECTORIES
        or name.endswith((".pyc", ".pyo"))
        or (Path(directory) / name).is_symlink()
    }


def preflight(skills: list[Path], skills_dir: Path, data_dir: Path, force: bool) -> None:
    validate_directory(skills_dir)
    validate_directory(data_dir)
    source_dir = skills[0].parent.resolve()
    if skills_dir.resolve().is_relative_to(source_dir):
        raise InstallError("The installation directory cannot be inside the source skills directory.")
    collisions = []
    for skill in skills:
        target = skills_dir / skill.name
        if target.is_symlink():
            raise InstallError(f"Refusing to replace a symlink: {target}")
        if exists(target):
            if not target.is_dir():
                raise InstallError(f"Skill destination is not a directory: {target}")
            collisions.append(target)
        if data_dir.resolve().is_relative_to(target.resolve()):
            raise InstallError(f"Data directory must be outside installed skill directories: {data_dir}")
    if collisions and not force:
        paths = "\n  ".join(str(path) for path in collisions)
        raise InstallError(
            f"Skills already exist; no files were changed:\n  {paths}\n"
            "Use --force to replace existing skill directories. Existing data is always preserved."
        )


def installed_data_directory(skills: list[Path], skills_dir: Path) -> Path | None:
    """Keep the active profile on updates unless the caller selects another one."""
    selected: Path | None = None
    for skill in skills:
        target = skills_dir / skill.name
        if target.is_symlink():
            raise InstallError(f"Refusing to replace a symlink: {target}")
        config = target / "instagram-config.json"
        if not exists(config):
            # Older installations did not have this configuration file.
            continue
        try:
            if config.is_symlink() or not config.is_file():
                raise ValueError("configuration must be a regular file")
            content = json.loads(config.read_text(encoding="utf-8"))
            value = content.get("data_dir") if isinstance(content, dict) else None
            if not isinstance(value, str) or not value or "\0" in value or not Path(value).is_absolute():
                raise ValueError("data_dir must be an absolute path")
            candidate = absolute_path(value)
        except (OSError, UnicodeError, ValueError) as error:
            raise InstallError(
                f"Invalid installed configuration: {config} ({error}). "
                "Select the profile explicitly with --data-dir. No files were changed."
            ) from None
        if selected is not None and candidate != selected:
            raise InstallError(
                "Installed skills have conflicting data directories. "
                "Select the profile explicitly with --data-dir. No files were changed."
            )
        selected = candidate
    return selected


def plan_data(data_dir: Path, migrate_claude: bool) -> tuple[list[tuple[Path, Path]], list[Path]]:
    """Legacy voice wins over the blank template, while destination files win over both."""
    planned: dict[str, Path] = {}
    if migrate_claude:
        legacy = Path.home() / ".claude" / "instagram"
        if legacy.is_dir():
            planned.update({
                source.name: source for source in sorted(legacy.glob("*.md"))
                if source.is_file() and not source.is_symlink()
            })
    planned.setdefault("voice.md", REPOSITORY / "templates" / "voice.md")
    additions, preserved = [], []
    for name, source in planned.items():
        destination = data_dir / name
        if exists(destination):
            preserved.append(destination)
        else:
            if not source.is_file():
                raise InstallError(f"Data source is missing: {source}")
            additions.append((source, destination))
    return additions, preserved


def copy_new_file(source: Path, destination: Path) -> bool:
    """Exclusive creation prevents even a concurrent install from replacing data."""
    try:
        output = destination.open("xb")
    except FileExistsError:
        return False
    try:
        with output, source.open("rb") as input_file:
            shutil.copyfileobj(input_file, output)
    except BaseException:
        destination.unlink()
        raise
    return True


def install(
    skills: list[Path], skills_dir: Path, data_dir: Path,
    additions: list[tuple[Path, Path]], force: bool = False,
) -> None:
    skills_dir.mkdir(parents=True, exist_ok=True)
    installed: list[Path] = []
    backups: list[tuple[Path, Path]] = []
    created_data: list[Path] = []
    with tempfile.TemporaryDirectory(prefix=".instagram-install-", dir=skills_dir) as temporary:
        staging = Path(temporary)
        backup_dir = staging / "backups"
        backup_dir.mkdir()
        try:
            # Finish every copy before replacing any installed skill.
            for skill in skills:
                staged = staging / skill.name
                shutil.copytree(skill, staged, ignore=ignore_assets)
                (staged / "instagram-config.json").write_text(
                    json.dumps({"data_dir": str(data_dir)}, indent=2) + "\n", encoding="utf-8",
                )
            # Destinations might have appeared while the source was copying.
            preflight(skills, skills_dir, data_dir, force)
            for skill in skills:
                target = skills_dir / skill.name
                # Recheck symlinks immediately before modifying a destination.
                if target.is_symlink():
                    raise InstallError(f"Refusing to replace a symlink: {target}")
                if exists(target):
                    if not force:
                        raise InstallError(f"Skill destination appeared during installation: {target}")
                    backup = backup_dir / skill.name
                    target.rename(backup)
                    backups.append((backup, target))
                (staging / skill.name).rename(target)
                installed.append(target)
            data_dir.mkdir(parents=True, exist_ok=True)
            for source, destination in additions:
                if copy_new_file(source, destination):
                    created_data.append(destination)
        except BaseException:
            for path in reversed(created_data):
                path.unlink()
            for target in reversed(installed):
                shutil.rmtree(target)
            for backup, target in reversed(backups):
                backup.rename(target)
            raise


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    result.add_argument("--agent", choices=("codex", "claude"), default="codex", help="Target agent (default: codex)")
    result.add_argument("--project", type=Path, help="Install for this project instead of globally")
    result.add_argument("--skills-dir", type=Path, help="Override the skills installation directory")
    result.add_argument(
        "--data-dir", type=Path,
        help="Override the persistent data directory (default: INSTAGRAM_AGENT_HOME, then agent/project data directory)",
    )
    result.add_argument("--migrate-claude", action="store_true", help="Copy legacy ~/.claude/instagram/*.md to Codex data, preserving existing files")
    result.add_argument("--force", action="store_true", help="Replace existing skill directories; never overwrite data")
    result.add_argument("--dry-run", action="store_true", help="Show the installation plan without changing any files")
    return result


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    argument_parser = parser()
    args = argument_parser.parse_args(argv)
    if args.migrate_claude and args.agent != "codex":
        argument_parser.error("--migrate-claude is only supported with --agent codex")
    agent_folder = ".agents" if args.agent == "codex" else ".claude"
    base = absolute_path(args.project) if args.project else Path.home()
    skills_dir = absolute_path(args.skills_dir or base / agent_folder / "skills")
    default_data_dir = base / (".instagram" if args.project else agent_folder + "/instagram")
    requested_data_dir = args.data_dir or os.environ.get("INSTAGRAM_AGENT_HOME")
    try:
        skills = discover_skills(REPOSITORY / "skills")
        if args.force and not requested_data_dir:
            requested_data_dir = installed_data_directory(skills, skills_dir)
        data_dir = absolute_path(requested_data_dir or default_data_dir)
        preflight(skills, skills_dir, data_dir, args.force)
        additions, preserved = plan_data(data_dir, args.migrate_claude)
        if args.dry_run:
            print(f"Dry run: would install {len(skills)} skills in {skills_dir}")
            for _, path in additions:
                print(f"  Create data: {path}")
            for path in preserved:
                print(f"  Preserve existing data: {path}")
            print("No files were changed.")
            return 0
        install(skills, skills_dir, data_dir, additions, force=args.force)
    except (InstallError, OSError, UnicodeError) as error:
        print(f"Installation failed: {error}", file=sys.stderr)
        return 1
    print(f"Installed {len(skills)} skills for {args.agent} in {skills_dir}")
    print(f"Instagram data: {data_dir}")
    print("Existing Instagram data was preserved.")
    if args.agent == "codex":
        print("Reopen Codex (or start a new session), then invoke $ig-reel.")
    else:
        print("Restart Claude Code (or start a new session), then invoke /ig-reel.")
    if args.skills_dir:
        print("Custom skills directory: make sure your agent is configured to discover it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
