/* ============================================================
   SUPERNOVA
   MAIN JAVASCRIPT
   ============================================================ */


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentQuestion = null;
let selectedAnswer = null;
let currentPosition = 1;


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const board = document.getElementById("board");
const rocket = document.getElementById("player");


/* ============================================================
   SCREENS
   ============================================================ */

const screens = {
    splash: document.getElementById("splashScreen"),
    home: document.getElementById("homeScreen"),
    setup: document.getElementById("setupScreen"),
    howToPlay: document.getElementById("howToPlayScreen"),
    about: document.getElementById("aboutScreen"),
    stats: document.getElementById("statsScreen"),
    game: document.getElementById("gameScreen"),
    results: document.getElementById("resultsScreen")
};


/* ============================================================
   SCREEN MANAGEMENT
   ============================================================ */

function showScreen(screen) {

    if (!screen) {
        return;
    }

    Object.values(screens).forEach(currentScreen => {

        if (currentScreen) {
            currentScreen.classList.remove("active");
        }

    });

    screen.classList.add("active");

    window.scrollTo(0, 0);
}


/* ============================================================
   BACKGROUND STARS
   ============================================================ */

function createBackgroundStars() {

    const containers = [
        document.getElementById("stars"),
        document.getElementById("homeStars")
    ];

    containers.forEach(container => {

        if (!container) {
            return;
        }

        container.innerHTML = "";

        for (let i = 0; i < 140; i++) {

            const star = document.createElement("div");

            star.classList.add("space-star");

            star.style.left =
                `${Math.random() * 100}%`;

            star.style.top =
                `${Math.random() * 100}%`;

            const size =
                Math.random() * 2.5 + 1;

            star.style.width =
                `${size}px`;

            star.style.height =
                `${size}px`;

            star.style.animationDelay =
                `${Math.random() * 5}s`;

            star.style.animationDuration =
                `${3 + Math.random() * 5}s`;

            container.appendChild(star);
        }

    });
}


/* ============================================================
   BOARD
   ============================================================ */

const positions = {};

function createBoard() {

    if (!board || !rocket) {
        return;
    }

    const existingCells =
        board.querySelectorAll(".cell");

    existingCells.forEach(cell => cell.remove());

    for (let row = 0; row < 10; row++) {

        const rowFromBottom = 9 - row;

        let numbers = [];

        if (rowFromBottom % 2 === 0) {

            for (let col = 0; col < 10; col++) {

                numbers.push(
                    rowFromBottom * 10 + col + 1
                );

            }

        } else {

            for (let col = 9; col >= 0; col--) {

                numbers.push(
                    rowFromBottom * 10 + col + 1
                );

            }

        }

        numbers.forEach((number, columnIndex) => {

            const cell =
                document.createElement("div");

            cell.classList.add("cell");

            cell.dataset.position =
                number;

            const numberLabel =
                document.createElement("span");

            numberLabel.classList.add(
                "cell-number"
            );

            numberLabel.textContent =
                number;

            cell.appendChild(numberLabel);

            board.appendChild(cell);

            const left =
                columnIndex * 10 + 5;

            const top =
                row * 10 + 5;

            positions[number] = {
                left,
                top
            };

        });

    }

    board.appendChild(rocket);
}


/* ============================================================
   ROCKET MOVEMENT
   ============================================================ */

function moveRocketToPosition(position) {

    if (!rocket) {
        return;
    }

    const location =
        positions[position];

    if (!location) {
        return;
    }

    rocket.style.left =
        `${location.left}%`;

    rocket.style.top =
        `${location.top}%`;

    currentPosition =
        position;
}


/* ============================================================
   START GAME
   ============================================================ */

async function startGame() {

    const playerName =
        document.getElementById("playerName")?.value.trim();

    const topic =
        document.getElementById("topic")?.value;

    const difficulty =
        document.getElementById("difficulty")?.value;

    try {

        const response =
            await fetch("/api/start", {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    player_name:
                        playerName || "Player",

                    topic,

                    difficulty
                })
            });

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        showScreen(screens.game);

        updateGameUI(
            data.game
        );

        displayQuestion(
            data.question
        );

        moveRocketToPosition(
            data.game.position
        );

    } catch (error) {

        console.error(
            "Could not start game:",
            error
        );

    }
}


/* ============================================================
   SUBMIT ANSWER
   ============================================================ */

async function submitAnswer() {

    if (!selectedAnswer) {
        return;
    }

    const answer =
        selectedAnswer;

    disableOptions();

    try {

        const response =
            await fetch("/api/answer", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    answer
                })

            });

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        showAnswerFeedback(
            data.correct
        );

        await wait(500);

        await processGameEvent(
            data.event
        );

        updateGameUI(
            data.game
        );

        await wait(900);

        if (data.game.game_over) {

            showResults(
                data.game
            );

            return;
        }

        selectedAnswer = null;

        loadNextQuestion();

    } catch (error) {

        console.error(
            "Answer submission error:",
            error
        );

    }
}


/* ============================================================
   LOAD NEXT QUESTION
   ============================================================ */

async function loadNextQuestion() {

    try {

        const response =
            await fetch(
                "/api/question"
            );

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        displayQuestion(
            data.question
        );

    } catch (error) {

        console.error(
            "Question loading error:",
            error
        );

    }
}


/* ============================================================
   QUESTIONS
   ============================================================ */

function displayQuestion(question) {

    if (!question) {
        return;
    }

    currentQuestion =
        question;

    selectedAnswer = null;

    const questionText =
        document.getElementById(
            "questionText"
        );

    const options =
        document.getElementById(
            "options"
        );

    const submit =
        document.getElementById(
            "submitAnswer"
        );

    if (!questionText || !options) {
        return;
    }

    questionText.textContent =
        question.question;

    options.innerHTML = "";

    if (submit) {
        submit.disabled = true;
    }

    question.options.forEach(option => {

        const button =
            document.createElement(
                "button"
            );

        button.classList.add(
            "answer-option"
        );

        button.textContent =
            option;

        button.addEventListener(
            "click",
            () => {

                selectOption(
                    button,
                    option
                );

            }
        );

        options.appendChild(
            button
        );

    });

    const questionNumber =
        document.getElementById(
            "questionNumber"
        );

    if (questionNumber) {

        questionNumber.textContent =
            `Q${getQuestionNumber()}`;

    }
}


function getQuestionNumber() {

    const hudPlayer =
        document.getElementById(
            "hudPlayer"
        );

    if (!hudPlayer) {
        return "1";
    }

    return (
        hudPlayer.dataset.questionNumber
        || "1"
    );
}


/* ============================================================
   ANSWER SELECTION
   ============================================================ */

function selectOption(button, answer) {

    const buttons =
        document.querySelectorAll(
            ".answer-option"
        );

    buttons.forEach(currentButton => {

        currentButton.classList.remove(
            "selected"
        );

    });

    button.classList.add(
        "selected"
    );

    selectedAnswer =
        answer;

    const submit =
        document.getElementById(
            "submitAnswer"
        );

    if (submit) {
        submit.disabled = false;
    }
}


/* ============================================================
   DISABLE ANSWERS
   ============================================================ */

function disableOptions() {

    const buttons =
        document.querySelectorAll(
            ".answer-option"
        );

    buttons.forEach(button => {

        button.disabled = true;

    });

    const submit =
        document.getElementById(
            "submitAnswer"
        );

    if (submit) {
        submit.disabled = true;
    }
}


/* ============================================================
   ANSWER FEEDBACK
   ============================================================ */

function showAnswerFeedback(correct) {

    const buttons =
        document.querySelectorAll(
            ".answer-option"
        );

    if (!currentQuestion) {
        return;
    }

    buttons.forEach(button => {

        if (
            button.textContent.trim() ===
            currentQuestion.answer.trim()
        ) {

            button.classList.add(
                "correct"
            );

        }

        if (
            button.classList.contains(
                "selected"
            ) &&
            !correct
        ) {

            button.classList.add(
                "wrong"
            );

        }

    });
}


/* ============================================================
   GAME EVENTS
   ============================================================ */

async function processGameEvent(event) {

    if (!event) {
        return;
    }

    /* CORRECT ANSWER */

    if (event.type === "rocket") {

        if (rocket) {

            rocket.classList.add(
                "rocket-flight"
            );

        }

        await wait(300);

        moveRocketToPosition(
            event.to
        );

        await wait(850);

        if (rocket) {

            rocket.classList.remove(
                "rocket-flight"
            );

        }

        if (event.special) {

            await processSpecialEvent(
                event.special
            );

        }

        return;
    }


    /* WRONG ANSWER */

    if (event.type === "wormhole") {

        await wormholeTravel(
            event
        );

    }

}


/* ============================================================
   SPECIAL EVENTS
   ============================================================ */

async function processSpecialEvent(special) {

    if (!special) {
        return;
    }

    /* BONUS */

    if (special.type === "bonus") {

        await wait(700);

        return;
    }


    /* CHECKPOINT */

    if (special.type === "checkpoint") {

        await wait(700);

        return;
    }


    /* ROCKET BOOST */

    if (special.type === "rocket") {

        await wait(400);

        if (rocket) {

            rocket.classList.add(
                "rocket-flight"
            );

        }

        moveRocketToPosition(
            special.to
        );

        await wait(850);

        if (rocket) {

            rocket.classList.remove(
                "rocket-flight"
            );

        }

        return;
    }


    /* SPECIAL WORMHOLE */

    if (special.type === "wormhole") {

        await wormholeTravel(
            special
        );

    }

}


/* ============================================================
   VORTEX CREATION
   ============================================================ */

function createVortex(position) {

    const location =
        positions[position];

    if (!location || !board) {

        console.error(
            "No board position found for vortex:",
            position
        );

        return null;
    }

    const vortex =
        document.createElement("div");

    vortex.className =
        "vortex";

    vortex.style.left =
        `${location.left}%`;

    vortex.style.top =
        `${location.top}%`;

    vortex.innerHTML = `
        <div class="vortex-glow"></div>
        <div class="vortex-ring ring-1"></div>
        <div class="vortex-ring ring-2"></div>
        <div class="vortex-ring ring-3"></div>
        <div class="vortex-spiral"></div>
        <div class="vortex-center"></div>
    `;

    board.appendChild(
        vortex
    );

    createVortexParticles(
        vortex
    );

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            vortex.classList.add(
                "open"
            );

        });

    });

    return vortex;
}


/* ============================================================
   VORTEX PARTICLES
   ============================================================ */

function createVortexParticles(vortex) {

    for (let i = 0; i < 12; i++) {

        const particle =
            document.createElement(
                "div"
            );

        particle.classList.add(
            "vortex-particle"
        );

        const angle =
            (360 / 12) * i;

        particle.style.setProperty(
            "--angle",
            `${angle}deg`
        );

        particle.style.animationDelay =
            `${i * 0.08}s`;

        vortex.appendChild(
            particle
        );

    }
}


/* ============================================================
   WORMHOLE TRAVEL
   ============================================================ */

async function wormholeTravel(event) {

    console.log(
        "🌀 WORMHOLE STARTED",
        event
    );

    if (!event) {
        return;
    }

    if (
        event.from === undefined ||
        event.to === undefined
    ) {

        console.error(
            "Wormhole event missing from/to:",
            event
        );

        return;
    }


    /* STEP 1 — CREATE VORTEX */

    const vortex =
        createVortex(
            event.from
        );

    if (!vortex) {
        return;
    }

    await wait(900);


    /* STEP 2 — SUCK ROCKET INSIDE */

    if (rocket) {

        rocket.classList.remove(
            "rocket-flight"
        );

        rocket.classList.remove(
            "exiting-vortex"
        );

        rocket.classList.add(
            "entering-vortex"
        );

    }

    await wait(800);


    /* STEP 3 — ROCKET DISAPPEARS */

    if (rocket) {

        rocket.style.opacity =
            "0";

    }

    await wait(250);


    /* STEP 4 — MOVE VORTEX */

    const destination =
        positions[event.to];

    if (!destination) {

        vortex.remove();

        if (rocket) {

            rocket.style.opacity =
                "1";

            rocket.classList.remove(
                "entering-vortex"
            );

        }

        return;
    }

    vortex.classList.add(
        "travelling"
    );

    vortex.style.left =
        `${destination.left}%`;

    vortex.style.top =
        `${destination.top}%`;

    await wait(1700);


    /* STEP 5 — MOVE ROCKET */

    moveRocketToPosition(
        event.to
    );

    await wait(150);


    /* STEP 6 — ROCKET EMERGES */

    if (rocket) {

        rocket.style.opacity =
            "1";

        rocket.classList.remove(
            "entering-vortex"
        );

        rocket.classList.add(
            "exiting-vortex"
        );

    }

    await wait(800);


    /* STEP 7 — CLOSE VORTEX */

    vortex.classList.remove(
        "travelling"
    );

    vortex.classList.remove(
        "open"
    );

    vortex.classList.add(
        "closing"
    );

    await wait(500);

    vortex.remove();

    if (rocket) {

        rocket.classList.remove(
            "exiting-vortex"
        );

        rocket.style.opacity =
            "1";

    }

    console.log(
        "🌀 WORMHOLE COMPLETE"
    );
}


/* ============================================================
   GAME UI
   ============================================================ */

function updateGameUI(game) {

    if (!game) {
        return;
    }

    const player =
        document.getElementById(
            "hudPlayer"
        );

    const position =
        document.getElementById(
            "hudPosition"
        );

    const score =
        document.getElementById(
            "hudScore"
        );

    const accuracy =
        document.getElementById(
            "hudAccuracy"
        );

    const streak =
        document.getElementById(
            "hudStreak"
        );

    const difficulty =
        document.getElementById(
            "hudDifficulty"
        );

    const achievements =
        document.getElementById(
            "achievementCount"
        );

    const message =
        document.getElementById(
            "gameMessage"
        );


    if (player) {

        player.textContent =
            game.player_name;

    }


    if (position) {

        position.textContent =
            `${game.position} / 100`;

    }


    if (score) {

        score.textContent =
            game.score;

    }


    if (accuracy) {

        accuracy.textContent =
            `${game.accuracy}%`;

    }


    if (streak) {

        streak.textContent =
            game.current_streak;

    }


    if (difficulty) {

        difficulty.textContent =
            (game.difficulty || "")
                .toUpperCase();

    }


    if (achievements) {

        achievements.textContent =
            (game.achievements || []).length;

    }


    if (message) {

        message.textContent =
            getGameMessage(game);

    }
}


/* ============================================================
   GAME MESSAGE
   ============================================================ */

function getGameMessage(game) {

    if (
        game.current_streak >= 3
    ) {

        return "🔥 You're on a streak!";

    }

    if (
        game.accuracy >= 80
    ) {

        return "🚀 Excellent performance!";

    }

    if (
        game.questions_answered === 0
    ) {

        return "🚀 Ready for your learning journey!";

    }

    return "🧠 Keep learning and keep moving!";
}


/* ============================================================
   RESULTS
   ============================================================ */

function showResults(game) {

    if (!game) {
        return;
    }

    const resultsPlayer =
        document.getElementById(
            "resultsPlayer"
        );

    const resultScore =
        document.getElementById(
            "resultScore"
        );

    const resultAccuracy =
        document.getElementById(
            "resultAccuracy"
        );

    const resultCorrect =
        document.getElementById(
            "resultCorrect"
        );

    const resultWrong =
        document.getElementById(
            "resultWrong"
        );

    const resultStreak =
        document.getElementById(
            "resultStreak"
        );

    const resultPosition =
        document.getElementById(
            "resultPosition"
        );


    if (resultsPlayer) {

        resultsPlayer.textContent =
            game.player_name;

    }


    if (resultScore) {

        resultScore.textContent =
            game.score;

    }


    if (resultAccuracy) {

        resultAccuracy.textContent =
            `${game.accuracy}%`;

    }


    if (resultCorrect) {

        resultCorrect.textContent =
            game.correct_answers;

    }


    if (resultWrong) {

        resultWrong.textContent =
            game.wrong_answers;

    }


    if (resultStreak) {

        resultStreak.textContent =
            game.best_streak;

    }


    if (resultPosition) {

        resultPosition.textContent =
            game.position;

    }


    renderTopicAnalysis(
        game.topic_stats
    );

    renderMistakes(
        game.mistakes
    );

    renderAchievements(
        game.achievements
    );

    showScreen(
        screens.results
    );
}


/* ============================================================
   TOPIC ANALYSIS — RESULTS
   ============================================================ */

function renderTopicAnalysis(topicStats) {

    const container =
        document.getElementById(
            "topicAnalysis"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const topics =
        Object.keys(
            topicStats || {}
        );

    if (topics.length === 0) {

        container.innerHTML =
            "<p>No topic data available.</p>";

        return;
    }

    topics.forEach(topic => {

        const data =
            topicStats[topic];

        const correct =
            data.correct || 0;

        const wrong =
            data.wrong || 0;

        const total =
            correct + wrong;

        const accuracy =
            total === 0
                ? 0
                : Math.round(
                    correct /
                    total *
                    100
                );

        const row =
            document.createElement(
                "div"
            );

        row.classList.add(
            "topic-row"
        );

        row.innerHTML = `

            <div class="topic-row-header">

                <span>
                    ${topic}
                </span>

                <span>
                    ${accuracy}%
                </span>

            </div>

            <div class="topic-bar">

                <div
                    class="topic-bar-fill"
                    style="width:${accuracy}%"
                ></div>

            </div>

        `;

        container.appendChild(
            row
        );

    });
}


/* ============================================================
   MISTAKES — RESULTS
   ============================================================ */

function renderMistakes(mistakes) {

    const container =
        document.getElementById(
            "mistakeList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !mistakes ||
        mistakes.length === 0
    ) {

        container.innerHTML = `

            <div class="mistake-item">

                <div class="mistake-question">
                    🎉 No mistakes!
                </div>

                <div class="mistake-details">
                    Excellent performance.
                </div>

            </div>

        `;

        return;
    }

    mistakes.forEach(mistake => {

        const item =
            document.createElement(
                "div"
            );

        item.classList.add(
            "mistake-item"
        );

        item.innerHTML = `

            <div class="mistake-question">

                ${mistake.question}

            </div>

            <div class="mistake-details">

                Your answer:

                <strong>
                    ${mistake.your_answer || mistake.selected_answer}
                </strong>

                <br>

                Correct answer:

                <strong>
                    ${mistake.correct_answer}
                </strong>

                <br>

                Topic:

                <strong>
                    ${mistake.topic}
                </strong>

            </div>

        `;

        container.appendChild(
            item
        );

    });
}


/* ============================================================
   ACHIEVEMENTS — RESULTS
   ============================================================ */

function renderAchievements(achievements) {

    const container =
        document.getElementById(
            "achievementList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !achievements ||
        achievements.length === 0
    ) {

        container.innerHTML = `

            <span class="achievement-badge">
                No achievements yet
            </span>

        `;

        return;
    }

    achievements.forEach(achievement => {

        const badge =
            document.createElement(
                "span"
            );

        badge.classList.add(
            "achievement-badge"
        );

        /*
         * Python currently stores achievements
         * as strings.
         */

        if (
            typeof achievement === "string"
        ) {

            badge.textContent =
                `🏆 ${achievement}`;

        } else {

            badge.textContent =
                `🏆 ${achievement.name || "Achievement"}`;

        }

        container.appendChild(
            badge
        );

    });
}


/* ============================================================
   STATISTICS PAGE
   ============================================================ */

async function loadStats() {

    try {

        const response =
            await fetch(
                "/api/state"
            );

        const data =
            await response.json();

        if (
            !data.success ||
            !data.game
        ) {

            console.log(
                "No statistics available."
            );

            return;

        }

        const game =
            data.game;


        /* -----------------------------------------
           OVERVIEW
           ----------------------------------------- */

        setText(
            "statsAccuracy",
            `${game.accuracy || 0}%`
        );

        setText(
            "statsQuestions",
            game.questions_answered || 0
        );

        setText(
            "statsBestStreak",
            game.best_streak || 0
        );

        setText(
            "statsScore",
            game.score || 0
        );


        /* -----------------------------------------
           PERFORMANCE
           ----------------------------------------- */

        setText(
            "statsCorrect",
            game.correct_answers || 0
        );

        setText(
            "statsWrong",
            game.wrong_answers || 0
        );

        setText(
            "statsCurrentStreak",
            game.current_streak || 0
        );

        setText(
            "statsAccuracyBarText",
            `${game.accuracy || 0}%`
        );


        const accuracyBar =
            document.getElementById(
                "statsAccuracyBar"
            );

        if (accuracyBar) {

            accuracyBar.style.width =
                `${game.accuracy || 0}%`;

        }


        /* -----------------------------------------
           DIFFICULTY
           ----------------------------------------- */

        setText(
            "statsDifficulty",
            `${game.difficulty || "EASY"} • ADAPTIVE`
        );


        /* -----------------------------------------
           MISSION PROGRESS
           ----------------------------------------- */

        setText(
            "statsPosition",
            `${game.position || 1} / 100`
        );

        setText(
            "statsTopic",
            game.topic || "Mixed"
        );


        /*
         * These counters are not currently returned
         * by Python, so we safely show 0 until we
         * add backend tracking.
         */

        setText(
            "statsWormholes",
            game.wormholes || 0
        );

        setText(
            "statsRocketBoosts",
            game.rocket_boosts || 0
        );


        /* -----------------------------------------
           TOPIC PERFORMANCE
           ----------------------------------------- */

        renderStatsTopics(
            game.topic_stats || {}
        );


        /* -----------------------------------------
           WEAK AREA
           ----------------------------------------- */

        renderWeakArea(
            game
        );


        /* -----------------------------------------
           ACHIEVEMENTS
           ----------------------------------------- */

        renderStatsAchievements(
            game.achievements || []
        );

    } catch (error) {

        console.error(
            "Failed to load statistics:",
            error
        );

    }
}


/* ============================================================
   SAFE TEXT HELPER
   ============================================================ */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* ============================================================
   TOPIC PERFORMANCE — STATS
   ============================================================ */

function renderStatsTopics(topicStats) {

    const container =
        document.getElementById(
            "topicPerformance"
        );

    if (!container) {
        return;
    }

    const topics =
        Object.entries(
            topicStats || {}
        );

    if (topics.length === 0) {

        container.innerHTML = `

            <div class="stats-empty">

                <span>🛰️</span>

                <p>
                    Answer more questions to map your knowledge.
                </p>

            </div>

        `;

        return;
    }

    container.innerHTML = "";

    topics.forEach(
        ([topic, stats]) => {

            const correct =
                stats.correct || 0;

            const wrong =
                stats.wrong || 0;

            const total =
                correct + wrong;

            const accuracy =
                total > 0
                    ? Math.round(
                        correct /
                        total *
                        100
                    )
                    : 0;

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "topic-card";

            card.innerHTML = `

                <div class="topic-card-header">

                    <span class="topic-card-name">
                        ${topic}
                    </span>

                    <span class="topic-card-percentage">
                        ${accuracy}%
                    </span>

                </div>

                <div class="topic-progress">

                    <div
                        class="topic-progress-fill"
                        style="width:${accuracy}%"
                    ></div>

                </div>

                <div class="topic-card-details">

                    <span>
                        ${correct} correct
                    </span>

                    <span>
                        ${total} attempted
                    </span>

                </div>

            `;

            container.appendChild(
                card
            );

        }
    );
}


/* ============================================================
   WEAK AREA — STATS
   ============================================================ */

function renderWeakArea(game) {

    const weakTopic =
        document.getElementById(
            "weakTopic"
        );

    const description =
        document.getElementById(
            "weakTopicDescription"
        );

    if (!weakTopic || !description) {
        return;
    }

    const topicStats =
        game.topic_stats || {};

    let weakestTopic =
        null;

    let weakestAccuracy =
        101;


    Object.entries(
        topicStats
    ).forEach(
        ([topic, stats]) => {

            const correct =
                stats.correct || 0;

            const wrong =
                stats.wrong || 0;

            const total =
                correct + wrong;

            if (total === 0) {
                return;
            }

            const accuracy =
                correct /
                total *
                100;

            if (
                accuracy <
                weakestAccuracy
            ) {

                weakestAccuracy =
                    accuracy;

                weakestTopic =
                    topic;

            }

        }
    );


    if (!weakestTopic) {

        weakTopic.textContent =
            "Keep exploring!";

        description.textContent =
            "Answer more questions and Superknova will identify the areas where you can improve.";

        return;
    }


    weakTopic.textContent =
        weakestTopic;

    description.textContent =
        `Your current accuracy in ${weakestTopic} is ${Math.round(weakestAccuracy)}%. Practice this topic to strengthen your knowledge.`;
}


/* ============================================================
   ACHIEVEMENTS — STATS PAGE
   ============================================================ */

function renderStatsAchievements(achievements) {

    const container =
        document.getElementById(
            "statsAchievements"
        );

    if (!container) {
        return;
    }

    if (
        !achievements ||
        achievements.length === 0
    ) {

        container.innerHTML = `

            <div class="achievement-empty">

                <span>🏆</span>

                <p>
                    Complete missions to unlock achievements.
                </p>

            </div>

        `;

        return;
    }

    container.innerHTML = "";

    achievements.forEach(
        achievement => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "achievement-card unlocked";

            let name =
                "Achievement";

            let description =
                "Achievement unlocked!";

            let icon =
                "🏆";


            if (
                typeof achievement === "string"
            ) {

                name =
                    achievement;

            } else if (
                achievement
            ) {

                name =
                    achievement.name ||
                    "Achievement";

                description =
                    achievement.description ||
                    "Achievement unlocked!";

                icon =
                    achievement.icon ||
                    "🏆";

            }


            card.innerHTML = `

                <div class="achievement-icon">
                    ${icon}
                </div>

                <h3>
                    ${name}
                </h3>

                <p>
                    ${description}
                </p>

            `;

            container.appendChild(
                card
            );

        }
    );
}


/* ============================================================
   ACHIEVEMENT POPUP
   DISABLED
   ============================================================ */

function showAchievement(achievement) {

    return;

}


/* ============================================================
   RESET GAME
   ============================================================ */

async function resetGame() {

    try {

        await fetch(
            "/api/reset",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Reset error:",
            error
        );

    }

    currentQuestion = null;

    selectedAnswer = null;

    currentPosition = 1;

    if (rocket) {

        rocket.style.opacity =
            "1";

        rocket.classList.remove(
            "rocket-flight",
            "entering-vortex",
            "exiting-vortex"
        );

    }

    moveRocketToPosition(1);
}


/* ============================================================
   HELPERS
   ============================================================ */

function wait(milliseconds) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


/* ============================================================
   NAVIGATION
   ============================================================ */

function goHome() {

    showScreen(
        screens.home
    );

}


function goToSetup() {

    showScreen(
        screens.setup
    );

}


function showHowToPlay() {

    showScreen(
        screens.howToPlay
    );

}


function showAbout() {

    showScreen(
        screens.about
    );

}


/* ============================================================
   BUTTON EVENTS
   ============================================================ */


/* START GAME */

const startButton =
    document.getElementById(
        "startButton"
    );

if (startButton) {

    startButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "/game";

        }
    );

}


/* HOW TO PLAY */

const howToPlayButton =
    document.getElementById(
        "howToPlayButton"
    );

if (howToPlayButton) {

    howToPlayButton.addEventListener(
        "click",
        () => {

            showScreen(
                screens.howToPlay
            );

        }
    );

}


/* ABOUT */

const aboutButton =
    document.getElementById(
        "aboutButton"
    );

if (aboutButton) {

    aboutButton.addEventListener(
        "click",
        () => {

            showScreen(
                screens.about
            );

        }
    );

}


/* BACK HOME */

const backHomeButton =
    document.getElementById(
        "backHomeButton"
    );

if (backHomeButton) {

    backHomeButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "/";

        }
    );

}


/* HOW TO PLAY BACK */

const howToPlayBack =
    document.getElementById(
        "howToPlayBack"
    );

if (howToPlayBack) {

    howToPlayBack.addEventListener(
        "click",
        () => {

            window.location.href =
                "/";

        }
    );

}


/* ABOUT BACK */

const aboutBack =
    document.getElementById(
        "aboutBack"
    );

if (aboutBack) {

    aboutBack.addEventListener(
        "click",
        () => {

            window.location.href =
                "/";

        }
    );

}


/* LAUNCH GAME */

const launchButton =
    document.getElementById(
        "launchButton"
    );

if (launchButton) {

    launchButton.addEventListener(
        "click",
        startGame
    );

}


/* SUBMIT ANSWER */

const submitButton =
    document.getElementById(
        "submitAnswer"
    );

if (submitButton) {

    submitButton.addEventListener(
        "click",
        submitAnswer
    );

}


/* QUIT */

const quitButton =
    document.getElementById(
        "quitButton"
    );

if (quitButton) {

    quitButton.addEventListener(
        "click",
        async () => {

            await resetGame();

            window.location.href =
                "/";

        }
    );

}


/* RESULTS → HOME */

const homeFromResults =
    document.getElementById(
        "homeFromResults"
    );

if (homeFromResults) {

    homeFromResults.addEventListener(
        "click",
        async () => {

            await resetGame();

            window.location.href =
                "/";

        }
    );

}


/* PLAY AGAIN */

const playAgain =
    document.getElementById(
        "playAgain"
    );

if (playAgain) {

    playAgain.addEventListener(
        "click",
        async () => {

            await resetGame();

            showScreen(
                screens.setup
            );

        }
    );

}


/* ============================================================
   HOMEPAGE NAVIGATION
   ============================================================ */

const aboutNav =
    document.getElementById(
        "aboutNav"
    );

const helpNav =
    document.getElementById(
        "helpNav"
    );

const playGameCard =
    document.getElementById(
        "playGameCard"
    );

const timerCard =
    document.getElementById(
        "timerCard"
    );


/* ABOUT US */

if (aboutNav) {

    aboutNav.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showScreen(
                screens.about
            );

        }
    );

}


/* HELP */

if (helpNav) {

    helpNav.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showScreen(
                screens.howToPlay
            );

        }
    );

}


/* PLAY GAME */

if (playGameCard) {

    playGameCard.addEventListener(
        "click",
        () => {

            window.location.href =
                "/game";

        }
    );

}


/* START TIMER */

if (timerCard) {

    timerCard.addEventListener(
        "click",
        () => {

            window.location.href =
                "/focus";

        }
    );

}


/* ============================================================
   STATISTICS BUTTON
   ============================================================ */

const statsCard =
    document.getElementById(
        "statsCard"
    );

const statsBack =
    document.getElementById(
        "statsBack"
    );

const statsBackBottom =
    document.getElementById(
        "statsBackBottom"
    );


/* OPEN STATS */

if (statsCard) {

    statsCard.addEventListener(
        "click",
        async () => {

            await loadStats();

            showScreen(
                screens.stats
            );

        }
    );

}


/* BACK TO HOME */

if (statsBack) {

    statsBack.addEventListener(
        "click",
        () => {

            showScreen(
                screens.home
            );

        }
    );

}


/* BOTTOM BACK TO HOME */

if (statsBackBottom) {

    statsBackBottom.addEventListener(
        "click",
        () => {

            showScreen(
                screens.home
            );

        }
    );

}


/* ============================================================
   CAROUSEL
   ============================================================ */

const prevFeature =
    document.getElementById(
        "prevFeature"
    );

const nextFeature =
    document.getElementById(
        "nextFeature"
    );

const featureCards =
    Array.from(
        document.querySelectorAll(
            ".feature-card"
        )
    );

let featuredIndex = 0;


function updateFeaturedCard() {

    featureCards.forEach(
        (card, index) => {

            card.classList.toggle(
                "featured",
                index === featuredIndex
            );

        }
    );

}


if (
    prevFeature &&
    featureCards.length
) {

    prevFeature.addEventListener(
        "click",
        () => {

            featuredIndex =
                (
                    featuredIndex -
                    1 +
                    featureCards.length
                ) %
                featureCards.length;

            updateFeaturedCard();

        }
    );

}


if (
    nextFeature &&
    featureCards.length
) {

    nextFeature.addEventListener(
        "click",
        () => {

            featuredIndex =
                (
                    featuredIndex +
                    1
                ) %
                featureCards.length;

            updateFeaturedCard();

        }
    );

}


updateFeaturedCard();


/* ============================================================
   INITIALISE
   ============================================================ */

function initialise() {

    createBackgroundStars();


    /* GAME PAGE */

    if (board && rocket) {

        createBoard();

        moveRocketToPosition(1);

        showScreen(
            screens.setup
        );

        return;
    }


    /* HOME PAGE */

    if (screens.splash) {

        document.documentElement
            .classList
            .add("splash-lock");

        document.body
            .classList
            .add("splash-lock");

        showScreen(
            screens.splash
        );

        setTimeout(
            () => {

                document.documentElement
                    .classList
                    .remove("splash-lock");

                document.body
                    .classList
                    .remove("splash-lock");

                showScreen(
                    screens.home
                );

            },
            2500
        );

        return;
    }


    showScreen(
        screens.home
    );
}


/* ============================================================
   START APPLICATION
   ============================================================ */

initialise();