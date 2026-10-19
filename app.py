from flask import Flask, render_template, request, jsonify, session
import json
import random
import time
app = Flask(__name__)
# Used for storing the current game session.
app.secret_key = "learnladder-secret-key"


# Question Bank
def load_questions():
    try:
        with open("questions.json", "r") as file:
            questions = json.load(file)
        print(f"Loaded {len(questions)} questions from questions.json")
        return questions
    except FileNotFoundError:
        print("ERROR: questions.json was not found!")
        return []
    except json.JSONDecodeError as e:
        print(f"ERROR: questions.json contains invalid JSON: {e}")

        return []

QUESTIONS = load_questions()

# Constants

MAX_POSITION = 100

# Movement is based on the actual question difficulty.
CORRECT_MOVEMENT = {
    "easy": 1,
    "medium": 3,
    "hard": 5
}

WRONG_MOVEMENT = {
    "easy": 5,
    "medium": 3,
    "hard": 1
}

# Special board squares.

SPECIAL_SQUARES = {
    12: "bonus",
    25: "rocket",
    38: "wormhole",
    50: "checkpoint",
    63: "bonus",
    75: "rocket",
    88: "wormhole"
}

# Game Initialization 

def create_game(player_name, topic="Mixed", difficulty="Adaptive"):
    return {
        "player_name": player_name,
        "position": 1,
        "score": 0,
        "correct_answers": 0,
        "wrong_answers": 0,
        "questions_answered": 0,
        "current_streak": 0,
        "best_streak": 0,
        "difficulty": difficulty,
        "topic": topic,
        "questions_used": [],
        "mistakes": [],
        "topic_stats": {},
        "achievements": [],
       
        "wormholes": 0,
        "rocket_boosts": 0,
        "game_over": False,
        "current_question": None,
        "last_event": None
    }

def get_game():
    return session.get("game")

def save_game(game):
    session["game"] = game
    session.modified = True


def get_available_questions(game):
    available = []
    for question in QUESTIONS:
        if question["id"] in game["questions_used"]:
            continue
        # Topic filtering.
        selected_topic = game["topic"]
        if selected_topic != "Mixed":
            if question["topic"] != selected_topic:
                continue
        # Difficulty filtering.
        selected_difficulty = game["difficulty"]
        if selected_difficulty != "Adaptive":
            if question["difficulty"] != selected_difficulty:
                continue
        else:
            adaptive_level = get_adaptive_difficulty(game)
            if question["difficulty"] != adaptive_level:
                continue
        available.append(question)

    # If no questions remain for the selected difficulty, allow questions from other difficulties.

    if not available:
        for question in QUESTIONS:
            if question["id"] in game["questions_used"]:
                continue
            if game["topic"] != "Mixed":
                if question["topic"] != game["topic"]:
                    continue
            available.append(question)
    return available

def get_adaptive_difficulty(game):
    if game["correct_answers"] >= 8 and game["current_streak"] >= 3:
        return "Hard"
    if game["wrong_answers"] >= 3:
        return "Easy"
    if game["correct_answers"] >= 3:
        return "Medium"
    return "Easy"

def choose_question(game):
    available = get_available_questions(game)
    if not available:
        return None
    question = random.choice(available)
    game["questions_used"].append(question["id"])
    game["current_question"] = question
    save_game(game)
    return question

# Statistics

def update_topic_statistics(game, question, correct):
    topic = question["topic"]
    if topic not in game["topic_stats"]:
        game["topic_stats"][topic] = {
            "correct": 0,
            "wrong": 0
        }
    if correct:
        game["topic_stats"][topic]["correct"] += 1
    else:
        game["topic_stats"][topic]["wrong"] += 1

def calculate_accuracy(game):
    total = game["questions_answered"]
    if total == 0:
        return 0
    return round(
        (game["correct_answers"] / total) * 100
    )

# Achievements

def check_achievements(game):
    new_achievement = None
    achievements = game["achievements"]

    def unlock(name, description):
        nonlocal new_achievement
        if name not in achievements:
            achievements.append(name)
            new_achievement = {
                "name": name,
                "description": description
            }

    if game["correct_answers"] >= 1:
        unlock(
            "First Launch",
            "Answer your first question correctly."
        )
    if game["current_streak"] >= 3:
        unlock(
            "Sharpshooter",
            "Get three questions correct in a row."
        )

    if game["correct_answers"] >= 10:
        unlock(
            "Knowledge Seeker",
            "Answer ten questions correctly."
        )

    if game["position"] >= 50:
        unlock(
            "Space Explorer",
            "Reach square 50."
        )

    if calculate_accuracy(game) == 100 and game["questions_answered"] >= 5:
        unlock(
            "Perfect Mission",
            "Maintain 100% accuracy for at least five questions."
        )

    if game["position"] >= 100:
        unlock(
            "Mission Complete",
            "Reach square 100."
        )

    return new_achievement

# Special Squares

def apply_special_square(game):
    position = game["position"]
    special = SPECIAL_SQUARES.get(position)

# Bonus

    if special == "bonus":
        game["score"] += 25
        return {
            "type": "bonus",
            "message": "Bonus square! +25 points!",
            "position": position

        }

# Rocket

    if special == "rocket":
        destination = min(
            position + 5,
            MAX_POSITION
        )

        game["position"] = destination
        # Statistics counter.
        game["rocket_boosts"] = game.get(
            "rocket_boosts",
            0
        ) + 1

        return {
            "type": "rocket",
            "from": position,
            "to": destination,
            "message": f"Rocket boost! You moved to {destination}!"
        }

# Wormhole

    if special == "wormhole":
        destination = max(
            position - 5,
            1
        )
        game["position"] = destination
        # Statistics counter.
        game["wormholes"] = game.get(
            "wormholes",
            0
        ) + 1
        return {
            "type": "wormhole",
            "from": position,
            "to": destination,
            "message": f"Wormhole! You travelled back to {destination}!"
        }

# Checkpoint

    if special == "checkpoint":
        game["score"] += 50
        return {
            "type": "checkpoint",
            "message": "Checkpoint reached! +50 points!",
            "position": position

        }

    return None

#Answer Processing

def process_answer(game, selected_answer):
    question = game["current_question"]
    if not question:
        return {
            "success": False,
            "message": "No active question."
        }
    correct_answer = question["answer"]

    # Use the difficulty of the actual question. This also works when the player selected Adaptive mode, because each question in the question bank has its own difficulty.
    question_difficulty = str(
        question.get("difficulty", game.get("difficulty", "Easy"))
    ).strip().lower()

    if question_difficulty not in {"easy", "medium", "hard"}:
        selected_difficulty = str(game.get("difficulty", "Easy")).strip().lower()
        if selected_difficulty == "adaptive":
            question_difficulty = get_adaptive_difficulty(game).lower()
        elif selected_difficulty in {"easy", "medium", "hard"}:
            question_difficulty = selected_difficulty
        else:
            question_difficulty = "easy"

    correct = (
        selected_answer.strip().lower() == correct_answer.strip().lower()
    )

    game["questions_answered"] += 1
    update_topic_statistics(
        game,
        question,
        correct
    )

# Correct

    if correct:
        game["correct_answers"] += 1
        game["current_streak"] += 1
        if game["current_streak"] > game["best_streak"]:
            game["best_streak"] = game["current_streak"]
        # Correct-answer movement depends on question difficulty:
        # Easy +1, Medium +3, Hard +5.
        movement = CORRECT_MOVEMENT[question_difficulty]
        # Streak bonus.
        if game["current_streak"] >= 3:
            movement += 1
        old_position = game["position"]
        game["position"] = min(
            game["position"] + movement,
            MAX_POSITION
        )
        # Score.
        points = 10
        if question_difficulty == "medium":
            points = 15
        elif question_difficulty == "hard":
            points = 20

        # Streak bonus
        points += game["current_streak"] * 2
        game["score"] += points

        # Normal rocket movement

        game["rocket_boosts"] = game.get(
            "rocket_boosts",
            0
        ) + 1
        game["last_event"] = {
            "type": "rocket",
            "from": old_position,
            "to": game["position"],
            "message": f"Correct! Rocket boost +{movement} squares!"
        }
        event = game["last_event"]
        special_event = apply_special_square(game)
        if special_event:
            event["special"] = special_event

# Wrong

    else:
        game["wrong_answers"] += 1
        game["current_streak"] = 0
        # Incorrect-answer movement depends on question difficulty:
        # Easy -5, Medium -3, Hard -1.
        movement = WRONG_MOVEMENT[question_difficulty]
        old_position = game["position"]
        game["position"] = max(
            game["position"] - movement,
            1
        )
        game["score"] = max(
            game["score"] - 5,
            0
        )
        mistake = {
            "question": question["question"],
            "your_answer": selected_answer,
            "correct_answer": correct_answer,
            "topic": question["topic"],
            "difficulty": question_difficulty.title()
        }

        game["mistakes"].append(mistake)
        # Count the normal wrong-answer wormhole.
        game["wormholes"] = game.get(
            "wormholes",
            0
        ) + 1
        game["last_event"] = {
            "type": "wormhole",
            "from": old_position,
            "to": game["position"],
            "message": f"Incorrect! Wormhole -{movement} squares!"
        }

        event = game["last_event"]

# Achievements

    achievement = check_achievements(game)
    if achievement:
        event["achievement"] = achievement

# Game Completion

    if game["position"] >= MAX_POSITION:
        game["position"] = MAX_POSITION
        game["game_over"] = True
        event["message"] = "MISSION COMPLETE! You reached square 100!"

    # Remove current question after answering.
    game["current_question"] = None
    save_game(game)
    return {
        "success": True,
        "correct": correct,
        "correct_answer": correct_answer,
        "event": event,
        "game": get_public_game(game)
    }

#Public Game Data

def get_public_game(game):
    return {
        "player_name": game["player_name"],
        "position": game["position"],
        "score": game["score"],
        "correct_answers": game["correct_answers"],
        "wrong_answers": game["wrong_answers"],
        "questions_answered": game["questions_answered"],
        "accuracy": calculate_accuracy(game),
        "current_streak": game["current_streak"],
        "best_streak": game["best_streak"],
        "difficulty": (
            get_adaptive_difficulty(game)
            if game["difficulty"] == "Adaptive"
            else game["difficulty"]
        ),
        "topic": game["topic"],
        "achievements": game["achievements"],
        "mistakes": game["mistakes"],
        "topic_stats": game["topic_stats"],

        # Statistics dashboard

        "wormholes": game.get("wormholes", 0),
        "rocket_boosts": game.get("rocket_boosts", 0),
        "game_over": game["game_over"]
    }

# Study Timer

def create_focus_mission(duration_minutes):
    """
    Creates a new study mission.
    The timer is controlled by Python using a server-side
    start timestamp rather than relying on a JavaScript countdown.
    """
    duration_minutes = int(duration_minutes)
    # Safety limits
    if duration_minutes < 1:
        duration_minutes = 1
    if duration_minutes > 120:
        duration_minutes = 120
    duration_seconds = duration_minutes * 60
    mission = {
        "duration_minutes": duration_minutes,
        "duration_seconds": duration_seconds,
        # Python timestamp
        "start_time": time.time(),
        "status": "running",
        "completed": False,
        "failed": False,
        "xp_earned": 0
    }

    session["focus_mission"] = mission
    session.modified = True
    return mission

def get_focus_mission():
    """
    Returns the current focus mission.
    """
    return session.get("focus_mission")

def get_focus_status():
    """
    Calculates the current state of the focus mission.
    IMPORTANT:
    The elapsed time is calculated by Python.
    """
    mission = get_focus_mission()
    if not mission:
        return {
            "success": False,
            "message": "No focus mission is active."
        }
    if mission["status"] != "running":
        return {
            "success": True,
            "mission": mission
        }

    current_time = time.time()
    elapsed_seconds = int(
        current_time - mission["start_time"]
    )
    duration_seconds = mission["duration_seconds"]
    remaining_seconds = max(
        duration_seconds - elapsed_seconds,
        0
    )

    # Progress from 0 to 1
    progress = min(
        elapsed_seconds / duration_seconds,
        1
    )

# Mission Complete

    if remaining_seconds <= 0:
        mission["status"] = "completed"
        mission["completed"] = True
        mission["failed"] = False
        # XP based on duration
        mission["xp_earned"] = (
            mission["duration_minutes"] * 4
        )
        session["focus_mission"] = mission
        session.modified = True
    return {
        "success": True,
        "status": mission["status"],
        "elapsed_seconds": min(
            elapsed_seconds,
            duration_seconds
        ),
        "remaining_seconds": remaining_seconds,
        "progress": progress,
        "duration_minutes": mission["duration_minutes"],
        "duration_seconds": duration_seconds,
        "completed": mission["completed"],
        "failed": mission["failed"],
        "xp_earned": mission["xp_earned"]
    }

def fail_focus_mission():
    """
    Ends the current mission early.
    """
    mission = get_focus_mission()
    if not mission:
        return {
            "success": False,
            "message": "No focus mission is active."
        }
    if mission["status"] != "running":
        return {
            "success": False,
            "message": "Mission is already finished."
        }

    current_time = time.time()
    elapsed_seconds = int(
        current_time - mission["start_time"]
    )

    mission["status"] = "failed"
    mission["completed"] = False
    mission["failed"] = True
    mission["xp_earned"] = 0
    mission["elapsed_seconds"] = elapsed_seconds
    session["focus_mission"] = mission
    session.modified = True
    return {
        "success": True,
        "status": "failed",
        "completed": False,
        "failed": True,
        "xp_earned": 0,
        "elapsed_seconds": elapsed_seconds
    }

# Game Routes

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/game")
def game_page():
    return render_template("game.html")

@app.route("/api/start", methods=["POST"])
def start_game():
    data = request.get_json() or {}
    player_name = data.get(
        "player_name",
        "Player"
    ).strip()
    topic = data.get(
        "topic",
        "Mixed"
    )

    difficulty = data.get(
        "difficulty",
        "Adaptive"
    )

    if not player_name:
        player_name = "Player"
    game = create_game(
        player_name,
        topic,
        difficulty
    )

    save_game(game)
    question = choose_question(game)
    return jsonify({
        "success": True,
        "game": get_public_game(game),
        "question": question
    })

@app.route("/api/question", methods=["GET"])
def next_question():
    game = get_game()
    if not game:
        return jsonify({
            "success": False,
            "message": "No active game."
        })

    if game["game_over"]:
        return jsonify({
            "success": False,
            "message": "Game is over."
        })

    question = choose_question(game)
    return jsonify({
        "success": True,
        "question": question
    })

@app.route("/api/answer", methods=["POST"])
def answer():
    game = get_game()
    if not game:
        return jsonify({
            "success": False,
            "message": "No active game."
        })

    data = request.get_json() or {}
    selected_answer = data.get(
        "answer",
        ""
    )

    result = process_answer(
        game,
        selected_answer
    )

    return jsonify(result)

# State Route

@app.route("/api/state", methods=["GET"])
def state():
    game = get_game()

    if not game:
        return jsonify({
            "success": True,
            "game": {
                "player_name": "Explorer",
                "position": 1,
                "score": 0,
                "correct_answers": 0,
                "wrong_answers": 0,
                "questions_answered": 0,
                "accuracy": 0,
                "current_streak": 0,
                "best_streak": 0,
                "difficulty": "Easy",
                "topic": "Mixed",
                "achievements": [],
                "mistakes": [],
                "topic_stats": {},
                "wormholes": 0,
                "rocket_boosts": 0,
                "game_over": False
            }
        })

    # Existing game.

    return jsonify({
        "success": True,
        "game": get_public_game(game)
    })

@app.route("/api/reset", methods=["POST"])
def reset():
    session.clear()
    return jsonify({
        "success": True
    })

# Focus Timer Routes

@app.route("/focus")
def focus_page():
    return render_template("focus.html")

@app.route("/api/focus/start", methods=["POST"])
def start_focus_mission():
    data = request.get_json() or {}
    duration = data.get(
        "duration",
        25
    )
    try:
        duration = int(duration)
    except (TypeError, ValueError):
        duration = 25
    # Keep duration between 1 and 120 minutes.
    duration = max(
        1,
        min(duration, 120)
    )
    mission = create_focus_mission(duration)
    return jsonify({
        "success": True,
        "status": "running",
        "duration_minutes": mission["duration_minutes"],
        "duration_seconds": mission["duration_seconds"],
        "message": "Mission launched!"
    })

@app.route("/api/focus/status", methods=["GET"])
def focus_status():
    return jsonify(
        get_focus_status()
    )

@app.route("/api/focus/fail", methods=["POST"])
def focus_fail():
    return jsonify(
        fail_focus_mission()
    )

@app.route("/api/focus/reset", methods=["POST"])
def focus_reset():
    session.pop(
        "focus_mission",
        None
    )
    session.modified = True
    return jsonify({
        "success": True,
        "message": "Focus mission reset."
    })


# Run Application

if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )