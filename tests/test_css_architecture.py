"""Parse all CSS and enforce the documented separation of responsibilities."""
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit, unquote

import tinycss2

WEB = Path(__file__).resolve().parents[1] / "web"


def rules(path):
    return tinycss2.parse_stylesheet(path.read_text(), skip_whitespace=True, skip_comments=True)


def declarations(rule):
    return tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True)


class CSSArchitectureTests(unittest.TestCase):
    def test_css_syntax_and_resource_paths(self):
        def check_rules(parsed, path):
            for rule in parsed:
                self.assertNotEqual(rule.type, "error", (path, rule))
                if rule.type == "qualified-rule":
                    for decl in declarations(rule):
                        self.assertEqual(decl.type, "declaration", (path, decl))
                        self.assertFalse(any(t.type == "error" for t in decl.value), (path, decl))
                elif rule.type == "at-rule" and rule.content is not None:
                    check_rules(tinycss2.parse_rule_list(rule.content, skip_whitespace=True, skip_comments=True), path)
        for path in WEB.rglob("*.css"):
            with self.subTest(path=path):
                check_rules(rules(path), path)
                for url in re.findall(r'url\([\'"]?([^\'"\)]+)', path.read_text()):
                    if not urlsplit(url).scheme:
                        self.assertTrue((path.parent / unquote(url)).is_file(), (path, url))

    def test_shared_styles_are_theme_independent(self):
        for name in ["style", "tokens", "layout", "components", "responsive"]:
            text = (WEB / "styles" / f"{name}.css").read_text()
            self.assertNotRegex(text, r"data-theme\s*=|starlight|magic-forest|quiet")
        entry = rules(WEB / "styles/style.css")
        self.assertTrue(all(r.type == "at-rule" and r.lower_at_keyword == "import" for r in entry))
        self.assertEqual(re.findall(r'@import url\("\./(.+?)"\)', (WEB / "styles/style.css").read_text()),
                         ["tokens.css", "layout.css", "components.css", "responsive.css"])

    def test_theme_palettes_only_set_public_appearance_tokens(self):
        token_rules = rules(WEB / "styles/tokens.css")
        sizing = {d.name for d in declarations(token_rules[0])}
        appearance = {d.name for d in declarations(token_rules[1])}
        for path in (WEB / "themes").glob("*/ui.css"):
            parsed = rules(path)
            self.assertEqual(len(parsed), 1)
            self.assertEqual(tinycss2.serialize(parsed[0].prelude).strip(), f':root[data-theme="{path.parent.name}"]')
            values = declarations(parsed[0])
            names = {d.name for d in values}
            self.assertTrue(all(d.type == "declaration" and d.name.startswith("--") for d in values))
            self.assertTrue(names <= appearance, (path, names - appearance))
            self.assertFalse(names & sizing, path)
            self.assertEqual(names, appearance, "Existing palettes must be complete to prevent leaked values")

    def test_existing_breakpoints_and_reduced_motion_are_preserved(self):
        parsed = rules(WEB / "styles/responsive.css")
        queries = [tinycss2.serialize(r.prelude).strip() for r in parsed if r.type == "at-rule"]
        self.assertEqual(queries, ["(max-width: 1120px)", "(max-width: 960px)",
            "(max-height: 720px) and (min-width: 769px)", "(max-width: 768px)",
            "(max-width: 400px)", "(prefers-reduced-motion: reduce)"])


if __name__ == "__main__":
    unittest.main()
