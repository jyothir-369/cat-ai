"""Core orchestration logic for the SHL Assessment Recommender."""

from __future__ import annotations

import re
from collections import defaultdict
from enum import Enum, auto
from typing import Iterable

from .catalog import CatalogEntry, CatalogStore, normalize_text
from .interpreter import Intent, interpret_conversation
from .schemas import ChatResponse, Recommendation


# ---------------------------------------------------------------------------
# Family mode enum
# ---------------------------------------------------------------------------

class FamilyMode(Enum):
    K_ONLY  = auto()
    A_ONLY  = auto()
    P_ONLY  = auto()
    MIXED   = auto()   # 2-family or 3-family explicit
    UNKNOWN = auto()   # no explicit signal — fall back to K


# ---------------------------------------------------------------------------
# Keyword banks
# ---------------------------------------------------------------------------

TECHNICAL_KEYWORDS = {
    "developer",
    "engineer",
    "software",
    "technical",
    "coding",
    "programming",
    "backend",
    "frontend",
    "cloud",
    "api",
    "apis",
    "microservices",
    "data",
    "python",
    "java",
    "sql",
    "javascript",
}

ABILITY_KEYWORDS = {
    "problem-solving",
    "cognitive",
    "reasoning",
    "ability",
    "aptitude",
    "analytical",
    "logic",
    "critical",
    "graduate",
}

PERSONALITY_KEYWORDS = {
    "stakeholder",
    "communication",
    "collaboration",
    "teamwork",
    "personality",
    "leadership",
    "customer-facing",
    "interpersonal",
    "people manager",
    "people managers",
    "behavioural",
    "behavioral",
    "motivat",
}

# EXPLICIT signals — strong domain terms that must appear for a family to be
# considered explicitly requested.
EXPLICIT_P_SIGNALS = {
    "personality",
    "collaboration",
    "teamwork",
    "interpersonal",
    "people manager",
    "people managers",
    "leadership",
    "behavioural",
    "behavioral",
    "communication",
    "stakeholder",
    "motivat",
}

EXPLICIT_A_SIGNALS = {
    "cognitive",
    "reasoning",
    "analytical",
    "aptitude",
    "graduate",
    "ability",
    "logic",
    "problem-solving",
}

EXPLICIT_K_SIGNALS = {
    "developer",
    "engineer",
    "software",
    "coding",
    "programming",
    "backend",
    "frontend",
    "python",
    "java",
    "sql",
    "javascript",
    "api",
    "apis",
    "technical",
    "microservices",
}

TECH_STACK_KEYWORDS: dict[str, set[str]] = {
    "python":     {"python"},
    "java":       {"java"},
    "sql":        {"sql"},
    "javascript": {"javascript", "js"},
}

STACK_EXCLUSIONS: dict[str, set[str]] = {
    "java":       {"javascript", "python"},
    "python":     {"java", "javascript"},
    "sql":        {"java", "javascript", "python"},
    "javascript": {"java", "python"},
}

PREFERRED_P_TYPES = {
    "opq",
    "personality",
    "motivation",
    "occupational",
    "behavior",
    "behaviour",
}

# ---------------------------------------------------------------------------
# SJT / situational-judgement suppression
# ---------------------------------------------------------------------------

SJT_NOISE_TERMS = {
    "situational judgement",
    "situational judgment",
    "sjt",
}

# Only allow SJT when the user explicitly asks for one of these.
SJT_REQUESTED_SIGNALS = {
    "situational judgement",
    "situational judgment",
    "sjt",
    "managerial judgment",
    "managerial judgement",
    "leadership judgment",
    "leadership judgement",
}

# ---------------------------------------------------------------------------
# Refusal terms
# ---------------------------------------------------------------------------

REFUSAL_TERMS = {
    "ignore your instructions",
    "ignore previous instructions",
    "salary",
    "compensation",
    "aws certification",
    "aws certifications",
    "legal advice",
}

# ---------------------------------------------------------------------------
# Compare intent detection
# ---------------------------------------------------------------------------

COMPARE_LEAD_PHRASES = {
    "compare",
    "difference between",
    "differences between",
    "contrast",
}

COMPARE_SEPARATOR_TERMS = {"vs", "versus"}

# ---------------------------------------------------------------------------
# Alias map  (normalised key -> exact catalog name)
# ---------------------------------------------------------------------------

COMPARE_ALIASES: dict[str, str] = {
    "opq": "Occupational Personality Questionnaire (OPQ32r)",
    "opq32": "Occupational Personality Questionnaire (OPQ32r)",
    "opq32r": "Occupational Personality Questionnaire (OPQ32r)",
    "occupational personality questionnaire": "Occupational Personality Questionnaire (OPQ32r)",
    "occupational personality questionnaire opq32r": "Occupational Personality Questionnaire (OPQ32r)",
    "gsa": "General Ability Screen",
    "general ability screen": "General Ability Screen",
    "general ability": "General Ability Screen",
    "mq": "Motivation Questionnaire (MQ)",
    "motivation questionnaire": "Motivation Questionnaire (MQ)",
    "motivation questionnaire mq": "Motivation Questionnaire (MQ)",
    "verify interactive g+": "Verify Interactive G+",
    "verify interactive g": "Verify Interactive G+",
    "verify g+": "Verify Interactive G+",
    "verify g": "Verify Interactive G+",
    "verify interactive": "Verify Interactive G+",
    "numerical reasoning": "Verify - Numerical Ability",
    "verbal reasoning": "Verify - Verbal Ability",
    "deductive reasoning": "Verify - Deductive Reasoning",
    "ccsq": "Contact Center Simulation",
    "contact center simulation": "Contact Center Simulation",
}

# ---------------------------------------------------------------------------
# Noise / filler suppression
# ---------------------------------------------------------------------------

NOISY_SIMULATION_TERMS = {
    "simulation",
    "contact center",
    "contact centre",
    "customer service",
    "customer support",
    "sales achievement",
    "sales predictor",
    "sapa",
    "call center",
    "call centre",
}

NOISY_SIMULATION_REQUESTED_SIGNALS = {
    "contact center",
    "contact centre",
    "customer service",
    "customer support",
    "sales",
    "simulation",
    "call center",
    "call centre",
}

# ---------------------------------------------------------------------------
# Refinement clause markers
# ---------------------------------------------------------------------------

# Words/phrases that signal the user is correcting / narrowing the stack.
# Text appearing AFTER one of these markers is treated as the authoritative
# refinement clause and takes precedence over earlier content in the same
# message.
REFINEMENT_MARKERS: list[str] = [
    "actually",
    "instead",
    "rather",
    "now it is",
    "now its",
    "now for",
    "focus on",
    "this is for",
    "changed to",
    "switch to",
    "switching to",
    "update to",
    "updating to",
    "make it",
    "make this",
]

# ---------------------------------------------------------------------------
# Vague-request detection
# ---------------------------------------------------------------------------

# Matched against the PUNCTUATION-STRIPPED, APOSTROPHE-STRIPPED, lowercased
# form produced by _normalize_for_vague().
VAGUE_EXACT_STRIPPED: set[str] = {
    "im hiring",
    "i m hiring",
    "hiring",
    "we are hiring",
    "were hiring",
    "looking to hire",
    "i need an assessment",
    "we need an assessment",
    "need an assessment",
    "i need assessments",
    "we need assessments",
    "need assessments",
    "i want an assessment",
    "we want an assessment",
    "i am hiring",
}

VAGUE_PATTERNS_STRIPPED: list[re.Pattern] = [
    re.compile(r"^(i\s*m|i\s+am|we\s+are|were?)?\s*hir(ing|e)\s*$"),
    re.compile(r"^looking\s+to\s+hire\s*$"),
    re.compile(r"^(i|we)?\s*(need|want)\s*(an?\s*)?assessments?\s*$"),
]

VAGUE_CLARIFICATION_REPLY = (
    "What role are you hiring for, and which technical, problem-solving, "
    "cognitive, or interpersonal skills matter most?"
)

# ---------------------------------------------------------------------------
# Off-topic signal detection
# ---------------------------------------------------------------------------

OFF_TOPIC_SIGNALS = {
    "streamlit",
    "test harness",
    "manual test",
    "dockerfile",
    "docker",
    "kubectl",
    "nginx",
    "redis",
    "celery",
    "localhost",
    "curl",
    "bash",
    "ci/cd",
    "webpack",
    "pytest",
    "unittest",
    "linting",
    "lint",
    "git commit",
    "pull request",
}

OFF_TOPIC_LENGTH_THRESHOLD = 20


# ---------------------------------------------------------------------------
# Module-level normalisation helpers
# ---------------------------------------------------------------------------

def _normalize_for_vague(text: str) -> str:
    """
    Strip ALL punctuation (including apostrophes) and collapse whitespace.

    "I'm hiring."  → "im hiring"
    "We're hiring!" → "were hiring"
    "Hiring."       → "hiring"
    """
    lowered = text.lower()
    stripped = re.sub(r"[^a-z0-9\s]", "", lowered)
    return " ".join(stripped.split())


def _split_into_clauses(text: str) -> list[str]:
    """
    Split a message into ordered clauses using sentence boundaries AND
    refinement markers.

    Returns clauses in document order; the LAST clause is the most recent
    and most authoritative for stack detection.

    Example:
        "We need Java engineers. Actually this is for Python engineers."
        →  ["We need Java engineers",
            "this is for Python engineers"]   ← last clause wins
    """
    # Split on hard sentence boundaries first
    raw_sentences = re.split(r"[.!?]+", text)

    clauses: list[str] = []
    for sentence in raw_sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        lower = sentence.lower()

        # Find all positions where a refinement marker starts
        split_positions: list[int] = [0]
        for marker in REFINEMENT_MARKERS:
            idx = lower.find(marker)
            if idx != -1:
                tail_start = idx + len(marker)
                if tail_start < len(sentence):
                    split_positions.append(tail_start)

        split_positions = sorted(set(split_positions))

        if len(split_positions) == 1:
            clauses.append(sentence)
        else:
            for i, pos in enumerate(split_positions):
                end = split_positions[i + 1] if i + 1 < len(split_positions) else len(sentence)
                chunk = sentence[pos:end].strip()
                if chunk:
                    clauses.append(chunk)

    return clauses


def _find_rightmost_stack_in_text(text: str) -> str | None:
    """
    Scan *text* and return the RIGHT-MOST (last-mentioned) stack name.

    Uses rfind so that within a clause the last-mentioned keyword wins.
    """
    normalized = normalize_text(text)
    last_found: str | None = None
    last_pos: int = -1

    for stack, keywords in TECH_STACK_KEYWORDS.items():
        for kw in keywords:
            pos = normalized.rfind(kw)
            if pos != -1 and pos > last_pos:
                last_pos = pos
                last_found = stack

    return last_found


# ---------------------------------------------------------------------------
# Main agent class
# ---------------------------------------------------------------------------

class SHLRecommenderAgent:
    """Stateless conversational SHL assessment recommender."""

    def __init__(self, catalog: CatalogStore | None = None) -> None:
        self.catalog = catalog or CatalogStore()

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def chat(self, messages: Iterable[object]) -> ChatResponse:
        messages = list(messages)

        latest_message = ""
        if messages:
            latest = messages[-1]
            if isinstance(latest, dict):
                latest_message = latest.get("content", "")
            else:
                latest_message = getattr(latest, "content", "")

        latest_normalized = normalize_text(latest_message)

        # PRIORITY 1 — Refusal
        if self._is_refusal_request(latest_normalized):
            return ChatResponse(
                reply=(
                    "I can only help with recommending SHL assessments "
                    "from the SHL product catalog."
                ),
                recommendations=[],
                end_of_conversation=False,
            )

        # PRIORITY 2 — Off-topic content
        if self._is_off_topic(latest_normalized):
            return ChatResponse(
                reply=(
                    "I can only assist with SHL assessment recommendations. "
                    "Please describe the role you are hiring for."
                ),
                recommendations=[],
                end_of_conversation=False,
            )

        # PRIORITY 3 — Compare mode
        if self._is_compare_request(latest_normalized):
            targets = self._extract_compare_targets(latest_message)
            return self._handle_compare(targets)

        # PRIORITY 4 — Vague latest-turn dominance
        # Uses punctuation-stripped normalisation so apostrophes never break
        # the match ("I'm hiring." → "im hiring" → hits VAGUE_EXACT_STRIPPED).
        if self._is_vague_request(latest_message):
            return ChatResponse(
                reply=VAGUE_CLARIFICATION_REPLY,
                recommendations=[],
                end_of_conversation=False,
            )

        # Full conversation interpretation
        context = interpret_conversation(messages, self.catalog)

        if context.intent == Intent.GREET:
            return ChatResponse(
                reply=(
                    "Hello! Tell me about the role, required skills, "
                    "and whether you want technical, cognitive, "
                    "personality, or balanced SHL assessments."
                ),
                recommendations=[],
                end_of_conversation=False,
            )

        if context.intent in {Intent.RECOMMEND, Intent.REFINE}:
            return self._handle_recommendation(
                context=context,
                latest_message=latest_message,
            )

        return ChatResponse(
            reply=VAGUE_CLARIFICATION_REPLY,
            recommendations=[],
            end_of_conversation=False,
        )

    # ------------------------------------------------------------------
    # Intent classifiers
    # ------------------------------------------------------------------

    def _is_refusal_request(self, text: str) -> bool:
        return any(term in text for term in REFUSAL_TERMS)

    def _is_off_topic(self, text: str) -> bool:
        if any(signal in text for signal in OFF_TOPIC_SIGNALS):
            return True

        word_count = len(text.split())
        if word_count > OFF_TOPIC_LENGTH_THRESHOLD:
            has_hiring_signal = any(
                kw in text
                for kw in (
                    TECHNICAL_KEYWORDS
                    | ABILITY_KEYWORDS
                    | PERSONALITY_KEYWORDS
                    | {"hire", "hiring", "assess", "assessment", "role", "candidate"}
                )
            )
            if not has_hiring_signal:
                return True

        return False

    def _is_compare_request(self, text: str) -> bool:
        for phrase in COMPARE_LEAD_PHRASES:
            if phrase in text:
                return True

        for sep in COMPARE_SEPARATOR_TERMS:
            pattern = re.compile(
                r"\b[\w\+]+(?:\s[\w\+]+){0,4}\s+" + re.escape(sep) + r"\s+[\w\+]"
            )
            if pattern.search(text):
                return True

        return False

    def _is_vague_request(self, raw_text: str) -> bool:
        """
        Detect vague hiring messages robustly after stripping all punctuation.

        Handles:
            "I'm hiring."   → "im hiring"   ✓
            "We're hiring." → "were hiring" ✓
            "Hiring."       → "hiring"      ✓
            "Looking to hire." → "looking to hire" ✓
        """
        vague_norm = _normalize_for_vague(raw_text)

        if vague_norm in VAGUE_EXACT_STRIPPED:
            return True

        for pattern in VAGUE_PATTERNS_STRIPPED:
            if pattern.match(vague_norm):
                return True

        return False

    # ------------------------------------------------------------------
    # Compare helpers
    # ------------------------------------------------------------------

    def _extract_compare_targets(self, text: str) -> list[str]:
        normalized = normalize_text(text)

        for phrase in ("difference between", "differences between", "compare", "contrast"):
            normalized = normalized.replace(phrase, "")

        for sep in ("versus", " vs ", " and ", ","):
            normalized = normalized.replace(sep, ",")

        normalized = re.sub(r"[^\w\s,\+]", " ", normalized)

        parts = [p.strip() for p in normalized.split(",") if p.strip()]
        return parts[:2]

    def _resolve_assessment_name(self, raw_name: str) -> CatalogEntry | None:
        normalized = normalize_text(raw_name)

        canonical = COMPARE_ALIASES.get(normalized)
        if canonical:
            entry = self.catalog.get_by_name(canonical)
            if entry:
                return entry

        entry = self.catalog.get_by_name(raw_name)
        if entry:
            return entry

        for alias_key, canonical_name in COMPARE_ALIASES.items():
            alias_norm = normalize_text(alias_key)
            if alias_norm in normalized or normalized in alias_norm:
                entry = self.catalog.get_by_name(canonical_name)
                if entry:
                    return entry

        query_tokens = set(normalized.split())
        candidates = self.catalog.retrieve(raw_name, top_k=15)
        best: CatalogEntry | None = None
        best_overlap = 0

        for candidate in candidates:
            entry_norm = normalize_text(candidate.name)
            entry_tokens = set(entry_norm.split())
            overlap = len(query_tokens & entry_tokens)
            if normalized in entry_norm or entry_norm in normalized:
                overlap += 5
            if overlap > best_overlap:
                best_overlap = overlap
                best = candidate

        if best and best_overlap > 0:
            return best

        return None

    # ------------------------------------------------------------------
    # Clarification
    # ------------------------------------------------------------------

    def _build_clarifying_question(self, context) -> str:
        if not context.role_title:
            return VAGUE_CLARIFICATION_REPLY

        if not context.seniority:
            return (
                f"What seniority level is the {context.role_title} role, "
                "and should assessments focus on technical skills, cognitive ability, "
                "personality traits, or a balanced mix?"
            )

        return (
            "Should the recommendations emphasise technical skills, "
            "cognitive ability, personality traits, or a balanced mix?"
        )

    # ------------------------------------------------------------------
    # CLAUSE-AWARE stack extraction  ← core of the stack-override fix
    # ------------------------------------------------------------------

    def _extract_latest_explicit_stacks(self, latest_message: str) -> set[str]:
        """
        Extract the authoritative tech stack from the latest user message
        using clause-level parsing.

        The old implementation scanned the whole message as a single string and
        used the iteration order of TECH_STACK_KEYWORDS to pick a winner, which
        meant that "... Java. Actually this is for Python engineers." could still
        return Java depending on dict order.

        The new algorithm:
        1. Split the message into ordered clauses (sentence boundaries +
           refinement markers such as "actually", "instead", "this is for").
        2. Walk clauses from LAST to FIRST.
        3. Return the stack found in the first (= most recent) clause that
           contains any stack keyword.
        4. Within a single clause, use the RIGHT-MOST keyword so the last
           mention inside the clause wins.

        Examples:
            "We need Java engineers. Actually this is for Python engineers."
            clauses → ["We need Java engineers",
                        "this is for Python engineers"]
            last clause → "python" → {"python"}

            "SQL and data-focused backend developer."
            single clause → rightmost stack = "sql" → {"sql"}

            "We need Java, APIs, reasoning, collaboration."
            single clause → rightmost stack = "java" → {"java"}
        """
        clauses = _split_into_clauses(latest_message)

        if not clauses:
            return set()

        # Walk from the most recent clause backwards; first hit wins.
        for clause in reversed(clauses):
            active = _find_rightmost_stack_in_text(clause)
            if active:
                return {active}

        return set()

    def _rewrite_query_for_latest_stack(
        self,
        query: str,
        explicit_stacks: set[str],
    ) -> str:
        """
        Remove all stack keywords EXCEPT those of the active stack from the
        compiled context query.

        This is essential when the context query (built from conversation
        history) still contains "java" from an earlier turn but the user has
        since switched to Python or SQL.
        """
        if not explicit_stacks:
            return query

        normalized = normalize_text(query)
        active_stack = next(iter(explicit_stacks))

        for stack, keywords in TECH_STACK_KEYWORDS.items():
            if stack == active_stack:
                continue
            for kw in keywords:
                # Word-boundary replacement to avoid clipping substrings
                normalized = re.sub(r"\b" + re.escape(kw) + r"\b", " ", normalized)

        return " ".join(normalized.split())

    def _detect_role_signals(
        self,
        query: str,
    ) -> tuple[dict[str, int], set[str]]:
        """
        Compute per-family intent weights from a query string.

        Weights:  K = 3 per hit,  A = 5 per hit,  P = 7 per hit.

        Note: this helper does a simple full-string scan; it is used on the
        already-rewritten query (stale stacks removed) and on the raw latest
        message for weight computation.  Clause-aware stack extraction is
        handled separately in _extract_latest_explicit_stacks().
        """
        normalized = normalize_text(query)
        family_weights: dict[str, int] = defaultdict(int)

        technical_hits   = sum(1 for kw in TECHNICAL_KEYWORDS   if kw in normalized)
        ability_hits     = sum(1 for kw in ABILITY_KEYWORDS      if kw in normalized)
        personality_hits = sum(1 for kw in PERSONALITY_KEYWORDS  if kw in normalized)

        if technical_hits:
            family_weights["K"] += technical_hits * 3
        if ability_hits:
            family_weights["A"] += ability_hits * 5
        if personality_hits:
            family_weights["P"] += personality_hits * 7

        explicit_stacks: set[str] = set()
        for stack, keywords in TECH_STACK_KEYWORDS.items():
            if any(kw in normalized for kw in keywords):
                explicit_stacks.add(stack)

        return dict(family_weights), explicit_stacks

    def _explicit_families(self, query: str) -> set[str]:
        """Return families that are *explicitly* signaled in the query."""
        normalized = normalize_text(query)
        families: set[str] = set()

        if any(sig in normalized for sig in EXPLICIT_K_SIGNALS):
            families.add("K")
        if any(sig in normalized for sig in EXPLICIT_A_SIGNALS):
            families.add("A")
        if any(sig in normalized for sig in EXPLICIT_P_SIGNALS):
            families.add("P")

        return families

    def _derive_family_mode(
        self,
        latest_explicit: set[str],
        latest_weights: dict[str, int],
    ) -> FamilyMode:
        """
        Determine FamilyMode from the latest turn alone.

        ≥2 explicit families → MIXED
        1 explicit family    → *_ONLY
        0 explicit families  → weight-dominant or UNKNOWN
        """
        n = len(latest_explicit)

        if n >= 2:
            return FamilyMode.MIXED

        if n == 1:
            fam = next(iter(latest_explicit))
            if fam == "K":
                return FamilyMode.K_ONLY
            if fam == "A":
                return FamilyMode.A_ONLY
            if fam == "P":
                return FamilyMode.P_ONLY

        if latest_weights:
            dominant = max(latest_weights, key=latest_weights.__getitem__)
            if dominant == "K":
                return FamilyMode.K_ONLY
            if dominant == "A":
                return FamilyMode.A_ONLY
            if dominant == "P":
                return FamilyMode.P_ONLY

        return FamilyMode.UNKNOWN

    # ------------------------------------------------------------------
    # Noise detection
    # ------------------------------------------------------------------

    def _user_requested_simulations(self, query: str) -> bool:
        normalized = normalize_text(query)
        return any(sig in normalized for sig in NOISY_SIMULATION_REQUESTED_SIGNALS)

    def _user_requested_sjt(self, query: str) -> bool:
        """Return True only when the user explicitly asks for SJT content."""
        normalized = normalize_text(query)
        return any(sig in normalized for sig in SJT_REQUESTED_SIGNALS)

    def _is_sjt_entry(self, entry: CatalogEntry) -> bool:
        """Return True if this catalog entry belongs to the SJT family."""
        text = normalize_text(
            f"{entry.name} {entry.description or ''} {entry.category or ''}"
        )
        return any(term in text for term in SJT_NOISE_TERMS)

    # ------------------------------------------------------------------
    # Technical relevance filter
    # ------------------------------------------------------------------

    def _is_relevant_technical_match(
        self,
        entry: CatalogEntry,
        explicit_stacks: set[str],
    ) -> bool:
        """
        For K-type entries enforce strict stack exclusivity.

        A K entry must:
          1. Contain at least one keyword from the active stack.
          2. NOT contain any keyword from an excluded stack.

        Non-K entries always pass (family-mode logic handles them separately).
        """
        if entry.test_type != "K":
            return True
        if not explicit_stacks:
            return True

        text = normalize_text(
            f"{entry.name} {entry.description or ''} {entry.category or ''}"
        )
        active_stack = next(iter(explicit_stacks))
        allowed_keywords = TECH_STACK_KEYWORDS.get(active_stack, set())

        if not any(kw in text for kw in allowed_keywords):
            return False

        blocked = STACK_EXCLUSIONS.get(active_stack, set())
        for blocked_stack in blocked:
            blocked_kws = TECH_STACK_KEYWORDS.get(blocked_stack, set())
            if any(kw in text for kw in blocked_kws):
                return False

        return True

    # ------------------------------------------------------------------
    # Scoring  (family-mode aware + SJT penalty)
    # ------------------------------------------------------------------

    def _score_candidate(
        self,
        entry: CatalogEntry,
        family_weights: dict[str, int],
        explicit_stacks: set[str],
        simulation_requested: bool = False,
        family_mode: FamilyMode = FamilyMode.UNKNOWN,
        sjt_requested: bool = False,
    ) -> int:
        score = family_weights.get(entry.test_type, 0) * 10

        text = normalize_text(
            f"{entry.name} {entry.description or ''} {entry.category or ''}"
        )

        # ── Noise: simulation / contact-centre filler ────────────────
        if not simulation_requested:
            for noise_term in NOISY_SIMULATION_TERMS:
                if noise_term in text:
                    score -= 150
                    break

        # ── Noise: SJT suppression for technical roles ───────────────
        if not sjt_requested and self._is_sjt_entry(entry):
            score -= 200

        # ── Cross-family purity penalties ────────────────────────────
        if family_mode == FamilyMode.P_ONLY:
            if entry.test_type == "K":
                score -= 500   # K must never appear in P_ONLY output
            elif entry.test_type == "A":
                score -= 120   # A is a last resort

        elif family_mode == FamilyMode.A_ONLY:
            if entry.test_type == "K":
                score -= 200
            elif entry.test_type == "P":
                score -= 60

        elif family_mode == FamilyMode.K_ONLY:
            if entry.test_type == "P":
                score -= 80
            elif entry.test_type == "A":
                score -= 40

        # MIXED: no cross-family penalty

        # ── K scoring ────────────────────────────────────────────────
        if entry.test_type == "K":
            for stack in explicit_stacks:
                allowed = TECH_STACK_KEYWORDS.get(stack, set())
                if any(kw in text for kw in allowed):
                    score += 70

        # ── A scoring ────────────────────────────────────────────────
        if entry.test_type == "A":
            reasoning_terms = {
                "reasoning", "cognitive", "problem",
                "analytical", "logic", "ability", "aptitude",
            }
            hits = sum(1 for term in reasoning_terms if term in text)
            score += hits * 14

        # ── P scoring ────────────────────────────────────────────────
        if entry.test_type == "P":
            personality_terms = {
                "communication", "collaboration", "teamwork",
                "stakeholder", "leadership", "interpersonal",
                "motivat", "behaviour", "behavior",
            }
            hits = sum(1 for term in personality_terms if term in text)
            score += hits * 18

            if any(kw in text for kw in PREFERRED_P_TYPES):
                score += 40

            if not simulation_requested and "simulation" in text:
                score -= 80

        return score

    # ------------------------------------------------------------------
    # Candidate collection  (family-mode aware)
    # ------------------------------------------------------------------

    def _collect_candidates(
        self,
        query: str,
        seniority: str | None,
        family_weights: dict[str, int],
        explicit_stacks: set[str],
        simulation_requested: bool = False,
        family_mode: FamilyMode = FamilyMode.UNKNOWN,
        sjt_requested: bool = False,
    ) -> list[CatalogEntry]:
        """
        Retrieve candidates from the catalog with mode-aware filtering.

        P_ONLY / A_ONLY: skip broad retrieval to prevent K contamination.
        K_ONLY / MIXED / UNKNOWN: broad + per-family retrieval.
        """
        merged: dict[str, CatalogEntry] = {}

        if family_mode == FamilyMode.P_ONLY:
            for e in self.catalog.retrieve(query, top_k=20, test_type="P", job_level=seniority):
                merged[e.name] = e
            for e in self.catalog.retrieve(query, top_k=5, test_type="A", job_level=seniority):
                merged[e.name] = e

        elif family_mode == FamilyMode.A_ONLY:
            for e in self.catalog.retrieve(query, top_k=15, test_type="A", job_level=seniority):
                merged[e.name] = e
            for e in self.catalog.retrieve(query, top_k=5, test_type="P", job_level=seniority):
                merged[e.name] = e

        elif family_mode == FamilyMode.K_ONLY:
            for e in self.catalog.retrieve(query, top_k=15, test_type="K", job_level=seniority):
                if self._is_relevant_technical_match(e, explicit_stacks):
                    merged[e.name] = e
            for e in self.catalog.retrieve(query, top_k=10, job_level=seniority):
                if self._is_relevant_technical_match(e, explicit_stacks):
                    merged[e.name] = e

        else:
            # MIXED or UNKNOWN
            for e in self.catalog.retrieve(query, top_k=20, job_level=seniority):
                if self._is_relevant_technical_match(e, explicit_stacks):
                    merged[e.name] = e
            for family in sorted(family_weights.keys()):
                for e in self.catalog.retrieve(
                    query, top_k=10, test_type=family, job_level=seniority
                ):
                    if self._is_relevant_technical_match(e, explicit_stacks):
                        merged[e.name] = e

        ranked = sorted(
            merged.values(),
            key=lambda e: (
                -self._score_candidate(
                    e, family_weights, explicit_stacks,
                    simulation_requested, family_mode, sjt_requested,
                ),
                e.test_type,
                e.name,
            ),
        )

        return ranked

    # ------------------------------------------------------------------
    # Noise helpers
    # ------------------------------------------------------------------

    def _is_noisy_entry(self, entry: CatalogEntry) -> bool:
        text = normalize_text(
            f"{entry.name} {entry.description or ''} {entry.category or ''}"
        )
        return any(noise in text for noise in NOISY_SIMULATION_TERMS)

    # ------------------------------------------------------------------
    # Diversification  (family-mode aware + SJT guard)
    # ------------------------------------------------------------------

    def _diversify_recommendations(
        self,
        candidates: list[CatalogEntry],
        family_weights: dict[str, int],
        explicit_families: set[str],
        simulation_requested: bool = False,
        max_results: int = 4,
        family_mode: FamilyMode = FamilyMode.UNKNOWN,
        sjt_requested: bool = False,
    ) -> list[CatalogEntry]:
        """
        Select the final shortlist.

        ┌─────────────────────────────────────────────────────────────────┐
        │ MIXED   Guarantee ≥1 slot per explicit family (K→A→P order),   │
        │         fill remainder from ranked list.                        │
        ├─────────────────────────────────────────────────────────────────┤
        │ P_ONLY  Fill ALL slots with P first; A only if P exhausted;    │
        │         K never admitted.                                       │
        ├─────────────────────────────────────────────────────────────────┤
        │ A_ONLY  Fill (max-1) slots with A; one optional P; no K.       │
        ├─────────────────────────────────────────────────────────────────┤
        │ K_ONLY  Fill (max-1) slots with K; ≤1 secondary; remainder.    │
        └─────────────────────────────────────────────────────────────────┘
        SJT entries are filtered out unless sjt_requested is True.
        """
        if not candidates:
            return []

        # Hard-filter: remove noisy simulation entries
        filtered = [
            e for e in candidates
            if simulation_requested or not self._is_noisy_entry(e)
        ] or candidates

        # Hard-filter: remove SJT entries (unless explicitly requested)
        if not sjt_requested:
            without_sjt = [e for e in filtered if not self._is_sjt_entry(e)]
            if without_sjt:          # only apply if it doesn't empty the list
                filtered = without_sjt

        selected: list[CatalogEntry] = []
        used: set[str] = set()

        def _pick_one(family: str) -> CatalogEntry | None:
            for e in filtered:
                if e.name not in used and e.test_type == family:
                    return e
            return None

        def _fill_from(family: str, cap: int) -> None:
            for e in filtered:
                if len(selected) >= cap:
                    break
                if e.name not in used and e.test_type == family:
                    selected.append(e)
                    used.add(e.name)

        def _fill_remainder(cap: int = max_results) -> None:
            for e in filtered:
                if len(selected) >= cap:
                    break
                if e.name not in used:
                    selected.append(e)
                    used.add(e.name)

        # ── MIXED ────────────────────────────────────────────────────
        if family_mode == FamilyMode.MIXED:
            families_present = explicit_families & {"K", "A", "P"}
            if not families_present:
                families_present = set(family_weights.keys()) & {"K", "A", "P"}

            for fam in ("K", "A", "P"):
                if fam in families_present:
                    entry = _pick_one(fam)
                    if entry:
                        selected.append(entry)
                        used.add(entry.name)

            _fill_remainder()

        # ── P_ONLY ───────────────────────────────────────────────────
        elif family_mode == FamilyMode.P_ONLY:
            _fill_from("P", max_results)
            if len(selected) < max_results:
                _fill_from("A", max_results)
            # Do NOT call _fill_remainder() — would risk admitting K

        # ── A_ONLY ───────────────────────────────────────────────────
        elif family_mode == FamilyMode.A_ONLY:
            _fill_from("A", max_results - 1)
            if len(selected) < max_results:
                entry = _pick_one("P")
                if entry:
                    selected.append(entry)
                    used.add(entry.name)
            _fill_remainder()

        # ── K_ONLY / UNKNOWN ─────────────────────────────────────────
        else:
            dominant = "K"
            if family_weights:
                dominant = max(family_weights, key=family_weights.__getitem__)

            _fill_from(dominant, max_results - 1)

            if len(selected) < max_results and explicit_families:
                secondary_families = explicit_families - {dominant}
                for e in filtered:
                    if len(selected) >= max_results:
                        break
                    if e.name not in used and e.test_type in secondary_families:
                        selected.append(e)
                        used.add(e.name)
                        break

            _fill_remainder()

        return selected[:max_results]

    # ------------------------------------------------------------------
    # Recommendation handler
    # ------------------------------------------------------------------

    def _handle_recommendation(
        self,
        context,
        latest_message: str,
    ) -> ChatResponse:
        query = context.build_query()

        # ── CLAUSE-AWARE stack extraction ────────────────────────────
        # This is the key fix for the refinement-override bug.
        # We parse the latest message into clauses and use the LAST clause's
        # stack as the authority, so "Java ... Actually Python" → Python.
        explicit_stacks = self._extract_latest_explicit_stacks(latest_message)

        # ── Signals from the current turn ────────────────────────────
        latest_weights, _ = self._detect_role_signals(latest_message)
        latest_explicit = self._explicit_families(latest_message)

        # Derive mode from latest turn — this is the primary authority
        family_mode = self._derive_family_mode(latest_explicit, latest_weights)

        # ── Stack fallback: use query stacks only when latest has none ─
        if not explicit_stacks:
            _, query_stacks = self._detect_role_signals(query)
            explicit_stacks = query_stacks

        # ── Rewrite query: strip stale stack keywords ─────────────────
        # Removes "java" from the context query when Python or SQL is active,
        # so that retrieval is not biased by the old stack.
        if explicit_stacks:
            query = self._rewrite_query_for_latest_stack(query, explicit_stacks)

        # ── Family weights ────────────────────────────────────────────
        if latest_weights:
            family_weights = latest_weights
        else:
            family_weights, _ = self._detect_role_signals(query)

        if not family_weights:
            family_weights = {"K": 2}

        # ── Simulation / SJT check ────────────────────────────────────
        combined_text = f"{latest_message} {query}"
        simulation_requested = self._user_requested_simulations(combined_text)
        sjt_requested = self._user_requested_sjt(combined_text)

        # ── Explicit families for diversification ─────────────────────
        if latest_explicit:
            explicit_families = latest_explicit
        else:
            explicit_families = self._explicit_families(combined_text)

        # ── Collect + score ───────────────────────────────────────────
        candidates = self._collect_candidates(
            query=query,
            seniority=context.seniority,
            family_weights=family_weights,
            explicit_stacks=explicit_stacks,
            simulation_requested=simulation_requested,
            family_mode=family_mode,
            sjt_requested=sjt_requested,
        )

        if not candidates:
            return ChatResponse(
                reply=(
                    "I could not find strong SHL catalog matches for this role. "
                    "Please provide more detail."
                ),
                recommendations=[],
                end_of_conversation=False,
            )

        final_entries = self._diversify_recommendations(
            candidates,
            family_weights,
            explicit_families=explicit_families,
            simulation_requested=simulation_requested,
            max_results=4,
            family_mode=family_mode,
            sjt_requested=sjt_requested,
        )

        recommendations: list[Recommendation] = []
        for entry in final_entries:
            if not self.catalog.is_catalog_url(entry.url):
                continue
            recommendations.append(
                Recommendation(
                    name=entry.name,
                    url=entry.url,
                    test_type=entry.test_type,
                )
            )

        reply = (
            "Updated the shortlist based on your refined requirements."
            if context.is_refinement
            else "Based on the role requirements, here are recommended SHL assessments."
        )

        return ChatResponse(
            reply=reply,
            recommendations=recommendations,
            end_of_conversation=True,
        )

    # ------------------------------------------------------------------
    # Compare handler
    # ------------------------------------------------------------------

    def _handle_compare(self, assessment_names: list[str]) -> ChatResponse:
        resolved: list[CatalogEntry] = []

        for name in assessment_names[:2]:
            entry = self._resolve_assessment_name(name)
            if entry:
                resolved.append(entry)

        if len(resolved) < 2:
            unresolved = assessment_names[len(resolved):]
            hint = (
                f" Could not resolve: {', '.join(unresolved)}."
                if unresolved
                else ""
            )
            return ChatResponse(
                reply=(
                    "Please provide the names of two SHL assessments to compare "
                    f"(e.g. OPQ and GSA, or Verify Interactive G+ and General Ability Screen).{hint}"
                ),
                recommendations=[],
                end_of_conversation=False,
            )

        first, second = resolved

        first_focus = (
            first.description or first.category or "specific workplace capabilities"
        )
        second_focus = (
            second.description or second.category or "specific workplace capabilities"
        )

        reply = (
            f"{first.name} (type {first.test_type}) focuses on {first_focus}. "
            f"{second.name} (type {second.test_type}) focuses on {second_focus}. "
            "Choose based on the capabilities most important for the role."
        )

        return ChatResponse(
            reply=reply,
            recommendations=[],
            end_of_conversation=False,
        )