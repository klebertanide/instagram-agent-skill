"""Check the skill pack's host-facing metadata without third-party packages."""

import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
NAMES = {
    "ig-audit", "ig-caption", "ig-carousel", "ig-comment", "ig-dm", "ig-human",
    "ig-plan", "ig-profile", "ig-reel", "ig-reply", "ig-repurpose", "ig-story", "ig-viral",
}


class PackagingTests(unittest.TestCase):
    def test_all_thirteen_have_valid_skill_frontmatter(self):
        paths = list((ROOT / "skills").glob("*/SKILL.md"))
        self.assertEqual({path.parent.name for path in paths}, NAMES)
        for path in paths:
            with self.subTest(skill=path.parent.name):
                content = path.read_text(encoding="utf-8")
                self.assertTrue(content.startswith("---\n"))
                frontmatter, body = content[4:].split("\n---\n", 1)
                name = re.search(r"^name: (.+)$", frontmatter, re.M).group(1)
                self.assertEqual(name, path.parent.name)
                self.assertRegex(name, r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
                description = frontmatter.split("description:", 1)[1].strip()
                description = re.sub(r"^>-\s*", "", description)
                description = " ".join(description.split())
                self.assertTrue(1 <= len(description) <= 1024)
                self.assertTrue(body.strip())

    def test_codex_ui_metadata_is_complete_for_each_skill(self):
        for name in sorted(NAMES):
            with self.subTest(skill=name):
                path = ROOT / "skills" / name / "agents" / "openai.yaml"
                lines = path.read_text(encoding="utf-8").splitlines()
                self.assertEqual(lines[0], "interface:")
                fields = {}
                for line in lines[1:]:
                    key, value = line.strip().split(": ", 1)
                    fields[key] = json.loads(value)
                self.assertTrue(fields["display_name"])
                self.assertTrue(25 <= len(fields["short_description"]) <= 64)
                self.assertIn("$" + name, fields["default_prompt"])

    def test_portable_manifest_and_claude_identity_are_consistent(self):
        portable = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        claude = json.loads((ROOT / ".claude-plugin/plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(portable["$schema"], "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json")
        self.assertEqual(portable["name"], "instagram-agent")
        self.assertEqual(portable["version"], claude["version"])
        self.assertEqual(portable["name"], claude["name"])
        self.assertTrue(set(portable) <= {
            "$schema", "name", "version", "description", "author", "homepage",
            "repository", "license", "keywords", "extensions",
        })
        interface = portable["extensions"]["com.openai"]["interface"]
        self.assertTrue(interface["displayName"])
        self.assertLessEqual(len(interface["defaultPrompt"]), 3)
        self.assertTrue(all(len(prompt) <= 128 for prompt in interface["defaultPrompt"]))

    def test_local_marketplaces_resolve_the_plugin_inside_this_repository(self):
        catalog = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text(encoding="utf-8"))
        legacy = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))
        self.assertEqual(catalog["name"], legacy["name"])
        self.assertEqual(len(catalog["plugins"]), 1)
        plugin = catalog["plugins"][0]
        self.assertEqual(plugin["name"], "instagram-agent")
        self.assertEqual(plugin["source"]["source"], "local")
        source = plugin["source"]["path"]
        self.assertTrue(source.startswith("./"))
        resolved = (ROOT / source).resolve()
        self.assertEqual(resolved, ROOT)
        self.assertTrue((resolved / "plugin.json").is_file())
        self.assertEqual(plugin["policy"]["installation"], "AVAILABLE")
        self.assertIn(plugin["policy"]["authentication"], {"ON_USE", "ON_INSTALL"})

    def test_bundled_rubric_and_hook_formulas_are_valid(self):
        hooks = json.loads((ROOT / "skills/ig-reel/hooks.json").read_text(encoding="utf-8"))
        self.assertEqual(len(hooks["hooks"]), 26)
        self.assertEqual(len({hook["id"] for hook in hooks["hooks"]}), 26)
        for hook in hooks["hooks"]:
            if hook.get("match"):
                re.compile(hook["match"])
        rubric = json.loads((ROOT / "skills/ig-profile/rubric.json").read_text(encoding="utf-8"))
        self.assertEqual(len(rubric["items"]), 12)
        self.assertEqual(sum(item["points"] for item in rubric["items"]), rubric["total"])


if __name__ == "__main__":
    unittest.main()
