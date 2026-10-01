#!/usr/bin/env python3
"""Check real Codex skill/plugin discovery without using an account or model.

All writable files, including HOME and CODEX_HOME in child processes, live in
a temporary directory. This is an optional integration check, not a mock of
Codex's parser. It requires an installed Codex CLI with app-server support.
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from typing import Any


REPO = Path(__file__).resolve().parents[1]
SKILLS = {
    "ig-audit", "ig-caption", "ig-carousel", "ig-comment", "ig-dm",
    "ig-human", "ig-plan", "ig-profile", "ig-reel", "ig-reply",
    "ig-repurpose", "ig-story", "ig-viral",
}
MARKETPLACE = "instagram-agent-skill"
PLUGIN = "instagram-agent"
PLUGIN_ID = f"{PLUGIN}@{MARKETPLACE}"


class CheckError(Exception):
    """An actionable integration-check failure."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise CheckError(message)


def run(command: list[str], cwd: Path, env: dict[str, str], timeout: float) -> str:
    try:
        result = subprocess.run(
            command, cwd=cwd, env=env, text=True, encoding="utf-8",
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise CheckError(f"{Path(command[0]).name} exceeded {timeout:g}s") from exc
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()[-800:]
        raise CheckError(f"{Path(command[0]).name} exited {result.returncode}: {detail}")
    return result.stdout


class AppServer:
    """Small cross-platform JSONL client with bounded requests and cleanup."""

    def __init__(self, binary: str, cwd: Path, env: dict[str, str], timeout: float):
        self.timeout = timeout
        self.next_id = 0
        self.messages: queue.Queue[Any] = queue.Queue()
        self.stderr = tempfile.TemporaryFile()
        try:
            self.process = subprocess.Popen(
                [binary, "app-server", "--listen", "stdio://"],
                cwd=cwd, env=env, text=True, encoding="utf-8", bufsize=1,
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.stderr,
            )
        except OSError:
            self.stderr.close()
            raise
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _read(self) -> None:
        try:
            assert self.process.stdout is not None
            for line in self.process.stdout:
                try:
                    self.messages.put(json.loads(line))
                except json.JSONDecodeError:
                    continue
        finally:
            self.messages.put(None)

    def send(self, message: dict[str, Any]) -> None:
        try:
            assert self.process.stdin is not None
            self.process.stdin.write(json.dumps(message) + "\n")
            self.process.stdin.flush()
        except (BrokenPipeError, OSError) as exc:
            raise CheckError("Codex app-server closed its input") from exc

    def request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        self.next_id += 1
        request_id = self.next_id
        self.send({"id": request_id, "method": method, "params": params})
        deadline = time.monotonic() + self.timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise CheckError(f"Codex {method} exceeded {self.timeout:g}s")
            try:
                message = self.messages.get(timeout=remaining)
            except queue.Empty as exc:
                raise CheckError(f"Codex {method} exceeded {self.timeout:g}s") from exc
            if message is None:
                raise CheckError(f"Codex app-server exited during {method}")
            if not isinstance(message, dict) or message.get("id") != request_id:
                continue
            if "error" in message:
                raise CheckError(f"Codex {method}: {message['error']}")
            require(isinstance(message.get("result"), dict), f"Invalid {method} response")
            return message["result"]

    def __enter__(self) -> AppServer:
        try:
            self.request("initialize", {
                "clientInfo": {"name": "instagram_skill_check", "version": "1.0"},
                "capabilities": {"experimentalApi": True},
            })
            self.send({"method": "initialized", "params": {}})
        except Exception:
            self.close()
            raise
        return self

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=2)
        self.reader.join(timeout=1)
        if self.process.stdin:
            self.process.stdin.close()
        if self.process.stdout:
            self.process.stdout.close()
        self.stderr.close()

    def __exit__(self, *_: Any) -> None:
        self.close()


def check_skills(server: AppServer, project: Path, plugin_install: bool = False) -> None:
    result = server.request("skills/list", {"cwds": [str(project)], "forceReload": True})
    entries = result.get("data", [])
    require(len(entries) == 1, "skills/list did not return exactly one project")
    entry = entries[0]
    require(not entry.get("errors"), f"Codex skill errors: {entry.get('errors')}")
    if plugin_install:
        skills = [s for s in entry.get("skills", []) if s.get("pluginId") == PLUGIN_ID]
    else:
        skills = [s for s in entry.get("skills", []) if s.get("name", "").startswith("ig-")]
    names = [s["name"].removeprefix(f"{PLUGIN}:") if plugin_install else s["name"] for s in skills]
    require(len(names) == 13 and set(names) == SKILLS,
            f"Expected exactly 13 Instagram skills; received {sorted(names)}")
    for skill in skills:
        name = skill["name"].removeprefix(f"{PLUGIN}:") if plugin_install else skill["name"]
        require(skill.get("enabled") is True, f"{name} is disabled")
        interface = skill.get("interface") or {}
        for key in ("displayName", "shortDescription", "defaultPrompt"):
            require(isinstance(interface.get(key), str) and bool(interface[key].strip()),
                    f"{name} is missing native UI metadata: {key}")
        require(f"${name}" in interface["defaultPrompt"],
                f"{name} defaultPrompt does not mention ${name}")
        path = Path(skill.get("path", ""))
        require(path.is_absolute() and path.is_file(), f"{name} has an invalid native path")
        if plugin_install:
            require(skill.get("pluginId") == PLUGIN_ID, f"{name} was not loaded from the plugin")
        else:
            require(path.is_relative_to(project / ".agents" / "skills"),
                    f"{name} was not loaded from the temporary project installation")


def check_plugin(server: AppServer, installed: bool = False) -> str:
    result = server.request("plugin/list", {
        "cwds": [str(REPO)], "marketplaceKinds": ["local"], "forceRefetch": False,
    })
    require(not result.get("marketplaceLoadErrors"),
            f"Codex marketplace errors: {result.get('marketplaceLoadErrors')}")
    markets = [m for m in result.get("marketplaces", []) if m.get("name") == MARKETPLACE]
    require(len(markets) == 1, f"Codex did not discover marketplace {MARKETPLACE}")
    marketplace = markets[0]
    require(Path(marketplace.get("path", "")) == REPO / ".agents/plugins/marketplace.json",
            "Codex did not load the native .agents plugin marketplace")
    plugins = [p for p in marketplace.get("plugins", []) if p.get("id") == PLUGIN_ID]
    require(len(plugins) == 1, f"Codex did not discover {PLUGIN_ID}")
    plugin = plugins[0]
    manifest = json.loads((REPO / "plugin.json").read_text(encoding="utf-8"))
    expected_interface = manifest["extensions"]["com.openai"]["interface"]
    version = plugin.get("localVersion") or plugin.get("version")
    require(version == manifest["version"], f"Native plugin version mismatch: {version}")
    require(plugin.get("source", {}).get("path") == str(REPO), "Plugin source is not this repository")
    interface = plugin.get("interface") or {}
    for key in ("displayName", "shortDescription", "defaultPrompt"):
        require(interface.get(key) == expected_interface[key], f"Plugin UI metadata mismatch: {key}")
    if installed:
        require(plugin.get("installed") is True and plugin.get("enabled") is True,
                "Temporary plugin installation is not installed and enabled")
    return str(version)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex", default="codex", help="Codex executable name or path")
    parser.add_argument("--timeout", type=float, default=20, help="Maximum seconds per operation (default: 20)")
    parser.add_argument("--install-plugin", action="store_true", help="Also verify an isolated CLI plugin installation")
    args = parser.parse_args()
    if not math.isfinite(args.timeout) or args.timeout <= 0:
        parser.error("--timeout must be finite and positive")
    binary = shutil.which(args.codex)
    if not binary:
        print("FAIL: Codex CLI is unavailable; install it to run this optional check.", file=sys.stderr)
        return 1
    try:
        with tempfile.TemporaryDirectory(prefix="instagram-codex-check-") as temp:
            work = Path(temp).resolve()
            home = work / "home"
            codex_home = work / "codex-home"
            project = work / "project"
            for folder in (home, codex_home, project):
                folder.mkdir()
            env = os.environ.copy()
            env.pop("INSTAGRAM_AGENT_HOME", None)
            env.update({
                "HOME": str(home), "USERPROFILE": str(home), "CODEX_HOME": str(codex_home),
                "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8",
            })
            run([sys.executable, str(REPO / "scripts/install.py"), "--project", str(project)],
                REPO, env, args.timeout)
            with AppServer(binary, project, env, args.timeout) as server:
                check_skills(server, project)
                version = check_plugin(server)
            if args.install_plugin:
                run([binary, "plugin", "marketplace", "add", str(REPO)], REPO, env, args.timeout)
                run([binary, "plugin", "add", PLUGIN_ID, "--json"], REPO, env, args.timeout)
                plugin_project = work / "plugin-project"
                plugin_project.mkdir()
                with AppServer(binary, plugin_project, env, args.timeout) as server:
                    check_plugin(server, installed=True)
                    check_skills(server, plugin_project, plugin_install=True)
            extra = " Plugin installation also passed." if args.install_plugin else ""
            print(f"PASS: Codex discovered all 13 skills with UI metadata and {PLUGIN_ID} v{version}.{extra}")
        return 0
    except (CheckError, OSError, ValueError, KeyError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
