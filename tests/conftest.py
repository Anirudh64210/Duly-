"""The `mutants` Hypothesis profile of specs/step-w/SPEC-W2-UNKNOWN.md point 52: the review round
runs the mutant script with `--hypothesis-profile mutants`, 10 examples per property. Registered
here, before pytest_configure loads the profile. tests/support/gaps.py reads the profile's
name to size the properties, since each property sets max_examples itself.
"""

from hypothesis import settings

settings.register_profile("mutants", max_examples=10, deadline=None, derandomize=True)
