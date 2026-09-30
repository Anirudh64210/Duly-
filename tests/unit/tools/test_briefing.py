"""Every lane is told the whole picture before its own part."""

from tools.factory.agent_run import own_part
from tools.factory.phase import briefing


def test_a_lane_sees_the_goal_and_the_lanes_beside_it():
    rnd = {
        "lanes": [
            {"lane": "L-engine", "mission": "Mark the stages\n  a petition nulled."},
            {"lane": "L-web", "mission": "Show the DSO line only on those rows."},
        ]
    }
    text = briefing({"goal": "Fix the  Timeline regression."}, rnd, rnd["lanes"][0])
    assert text == (
        "The whole picture: Fix the Timeline regression.\n\n"
        "Beside you in this round: L-web: Show the DSO line only on those rows.\n\n"
        "Your part: Mark the stages a petition nulled."
    )


def test_a_lone_lane_with_no_goal_gets_its_part_only():
    rnd = {"lanes": [{"lane": "L-tests", "mission": "Write tests."}]}
    assert briefing({}, rnd, rnd["lanes"][0]) == "Your part: Write tests."


def test_cards_and_commits_show_the_lanes_own_part():
    assert own_part("The whole picture: X.\n\nYour part: Write tests.") == "Write tests."
    assert own_part("Write tests.") == "Write tests."
