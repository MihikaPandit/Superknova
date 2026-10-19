// ============================================================
// LEARNLADDER FOCUS MISSION
// ============================================================


let selectedMinutes = 25;

let statusInterval = null;


// ============================================================
// ELEMENTS
// ============================================================

const setupScreen =
    document.getElementById("setupScreen");

const missionScreen =
    document.getElementById("missionScreen");

const resultScreen =
    document.getElementById("resultScreen");

const launchButton =
    document.getElementById("launchButton");

const abortButton =
    document.getElementById("abortButton");

const againButton =
    document.getElementById("againButton");

const timer =
    document.getElementById("timer");

const rocket =
    document.getElementById("rocket");

const progressFill =
    document.getElementById("progressFill");

const progressText =
    document.getElementById("progressText");

const missionStatus =
    document.getElementById("missionStatus");

const focusMessage =
    document.getElementById("focusMessage");

const resultIcon =
    document.getElementById("resultIcon");

const resultTitle =
    document.getElementById("resultTitle");

const resultMessage =
    document.getElementById("resultMessage");

const xpEarned =
    document.getElementById("xpEarned");

const customMinutes =
    document.getElementById("customMinutes");


// ============================================================
// TIME BUTTONS
// ============================================================

document
    .querySelectorAll(".time-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".time-button")
                    .forEach(btn => {
                        btn.classList.remove("selected");
                    });

                button.classList.add("selected");

                selectedMinutes =
                    parseInt(
                        button.dataset.time
                    );

                customMinutes.value = "";
            }
        );

    });


// ============================================================
// CUSTOM TIME
// ============================================================

customMinutes.addEventListener(
    "input",
    () => {

        if (customMinutes.value) {

            document
                .querySelectorAll(".time-button")
                .forEach(btn => {
                    btn.classList.remove("selected");
                });

            selectedMinutes =
                parseInt(
                    customMinutes.value
                );

        }

    }
);


// ============================================================
// LAUNCH
// ============================================================

launchButton.addEventListener(
    "click",
    startMission
);


async function startMission() {

    let duration =
        selectedMinutes;


    if (
        customMinutes.value
    ) {

        duration =
            parseInt(
                customMinutes.value
            );

    }


    if (
        isNaN(duration) ||
        duration < 1 ||
        duration > 120
    ) {

        alert(
            "Please choose a study time between 1 and 120 minutes."
        );

        return;

    }


    launchButton.disabled = true;


    try {

        const response =
            await fetch(
                "/api/focus/start",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        duration: duration
                    })
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                "Could not start mission."
            );

            launchButton.disabled = false;

            return;

        }


        setupScreen.classList.add("hidden");

        resultScreen.classList.add("hidden");

        missionScreen.classList.remove("hidden");


        startStatusChecking();

    }

    catch (error) {

        console.error(error);

        alert(
            "Could not connect to the server."
        );

    }

    finally {

        launchButton.disabled = false;

    }

}


// ============================================================
// CHECK PYTHON TIMER
// ============================================================

function startStatusChecking() {

    stopStatusChecking();


    // Immediately check status

    updateMissionStatus();


    // Then ask Python every second

    statusInterval =
        setInterval(
            updateMissionStatus,
            1000
        );

}


function stopStatusChecking() {

    if (statusInterval) {

        clearInterval(
            statusInterval
        );

        statusInterval = null;

    }

}


// ============================================================
// UPDATE MISSION
// ============================================================

async function updateMissionStatus() {

    try {

        const response =
            await fetch(
                "/api/focus/status"
            );


        const data =
            await response.json();


        if (!data.success) {

            return;

        }


        updateTimerUI(data);


        // ----------------------------------------------------
        // COMPLETED
        // ----------------------------------------------------

        if (
            data.status === "completed"
        ) {

            stopStatusChecking();

            showMissionComplete(
                data
            );

        }

    }

    catch (error) {

        console.error(
            "Timer update error:",
            error
        );

    }

}


// ============================================================
// TIMER UI
// ============================================================

function updateTimerUI(data) {

    const remaining =
        data.remaining_seconds || 0;


    const minutes =
        Math.floor(
            remaining / 60
        );


    const seconds =
        remaining % 60;


    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


    // Progress percentage

    const progress =
        Math.round(
            (data.progress || 0) * 100
        );


    progressFill.style.width =
        `${progress}%`;


    progressText.textContent =
        `${progress}%`;


    // Rocket position

    // 5% -> 91%

    const rocketPosition =
        5 + (progress * 0.86);


    rocket.style.left =
        `${rocketPosition}%`;


    if (progress >= 75) {

        focusMessage.textContent =
            "🌎 Almost there! Keep focusing.";

    }
    else if (progress >= 50) {

        focusMessage.textContent =
            "🚀 Halfway through the mission. Keep going.";

    }
    else if (progress >= 25) {

        focusMessage.textContent =
            "⭐ Good progress. Stay focused.";

    }
    else {

        focusMessage.textContent =
            "🚀 Stay focused. Your rocket is travelling to the planet.";

    }

}


// ============================================================
// MISSION COMPLETE
// ============================================================

function showMissionComplete(data) {

    missionScreen.classList.add(
        "hidden"
    );

    resultScreen.classList.remove(
        "hidden"
    );


    resultIcon.textContent =
        "🌟";


    resultTitle.textContent =
        "MISSION COMPLETE";


    resultMessage.textContent =
        `You successfully completed your ${data.duration_minutes}-minute focus mission and landed on Planet Nova!`;


    xpEarned.textContent =
        `+${data.xp_earned} XP`;

}


// ============================================================
// ABORT / FAIL
// ============================================================

abortButton.addEventListener(
    "click",
    failMission
);


async function failMission() {

    const confirmEnd =
        confirm(
            "Are you sure you want to end the mission? The rocket will not reach the planet."
        );


    if (!confirmEnd) {

        return;

    }


    stopStatusChecking();


    try {

        const response =
            await fetch(
                "/api/focus/fail",
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (data.success) {

            showMissionFailed();

        }

    }

    catch (error) {

        console.error(error);

    }

}


// ============================================================
// MISSION FAILED
// ============================================================

function showMissionFailed() {

    missionScreen.classList.add(
        "hidden"
    );

    resultScreen.classList.remove(
        "hidden"
    );


    resultIcon.textContent =
        "💥";


    resultTitle.textContent =
        "MISSION FAILED";


    resultMessage.textContent =
        "The rocket did not reach Planet Nova. Your focus mission ended early.";


    xpEarned.textContent =
        "+0 XP";

}


// ============================================================
// NEW MISSION
// ============================================================

againButton.addEventListener(
    "click",
    () => {

        resultScreen.classList.add(
            "hidden"
        );

        setupScreen.classList.remove(
            "hidden"
        );

        timer.textContent =
            "25:00";

        progressFill.style.width =
            "0%";

        progressText.textContent =
            "0%";

        rocket.style.left =
            "5%";

    }
);


// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        stopStatusChecking();

    }
);