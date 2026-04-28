/**
 * Eldritch Typecraft - Typing Engine
 */

// DOM Elements
const fileInput = document.getElementById('fileInput');
const timeLimitInput = document.getElementById('timeLimit');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timeDisplay = document.getElementById('timeDisplay');
const wpmDisplay = document.getElementById('wpmDisplay');
const errorDisplay = document.getElementById('errorDisplay');
const typingArea = document.getElementById('typingArea');

// State Variables
let textToType = "";
let characters = []; // Array of span elements
let currentIndex = 0;
let errors = 0;
let timer = null;
let timeElapsed = 0; // in seconds
let isRunning = false;
let timeLimit = null; // in seconds

// --- File Handling ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        loadText(event.target.result);
    };
    reader.readAsText(file);
});

function loadText(text) {
    // Sanitize and prepare text
    textToType = sanitizeText(text).trim().replace(/\s+/g, ' ');
    resetGame();
    
    // Create spans for each character
    typingArea.innerHTML = "";
    characters = textToType.split('').map(char => {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('char');
        typingArea.appendChild(span);
        return span;
    });

    if (characters.length > 0) {
        characters[0].classList.add('current');
        startBtn.disabled = false;
        // Focus and listen immediately
        typingArea.focus();
        typingArea.addEventListener('keydown', handleKeyPress);
    }
}

function sanitizeText(text) {
    return text
        // Replace curly quotes and apostrophes
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        // Replace various dashes
        .replace(/[\u2013\u2014]/g, "-")
        // Replace ellipsis
        .replace(/\u2026/g, "...")
        // Normalize accented characters (remove diacritics)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        // Remove any other non-ASCII characters that might be tricky
        .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

// --- Game Logic ---

function startGame() {
    // Invoke now just ensures focus and readiness
    if (!textToType) return;
    typingArea.focus();
    if (!isRunning) {
        // Just visually update buttons, timer starts on first key
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        fileInput.disabled = true;
        timeLimitInput.disabled = true;
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    fileInput.disabled = true;
    timeLimitInput.disabled = true;

    // Handle Time Limit
    const limitVal = parseInt(timeLimitInput.value);
    if (!isNaN(limitVal) && limitVal > 0) {
        timeLimit = limitVal * 60;
    } else {
        timeLimit = null;
    }

    timer = setInterval(updateTimer, 1000);
}

function pauseGame() {
    isRunning = false;
    clearInterval(timer);
    timer = null;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resetGame() {
    pauseGame();
    currentIndex = 0;
    errors = 0;
    timeElapsed = 0;
    timeLimit = null;
    
    // UI Reset
    timeDisplay.innerText = "00:00";
    wpmDisplay.innerText = "0";
    errorDisplay.innerText = "0";
    
    if (characters.length > 0) {
        characters.forEach(span => {
            span.classList.remove('correct', 'incorrect', 'current');
        });
        characters[0].classList.add('current');
        startBtn.disabled = false;
    }
    
    fileInput.disabled = false;
    timeLimitInput.disabled = false;
    typingArea.scrollTop = 0;
}

function updateTimer() {
    timeElapsed++;
    
    let displayTime = timeElapsed;
    if (timeLimit) {
        displayTime = timeLimit - timeElapsed;
        if (displayTime <= 0) {
            endGame();
            displayTime = 0;
        }
    }

    const mins = Math.floor(displayTime / 60).toString().padStart(2, '0');
    const secs = (displayTime % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${mins}:${secs}`;

    calculateStats();
}

function handleKeyPress(e) {
    // Ignore meta keys (Ctrl, Alt, etc) but handle Backspace and single chars
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;
    
    // Start timer on first valid key press
    if (!isRunning && e.key !== 'Backspace') {
        startTimer();
    }

    if (!isRunning && currentIndex === 0) return; // Don't process keys if not started/paused

    // Prevent browser shortcuts (like Firefox search) and scrolling
    e.preventDefault();

    const expectedChar = textToType[currentIndex];
    const currentCharSpan = characters[currentIndex];

    if (e.key === 'Backspace') {
        if (currentIndex > 0) {
            currentCharSpan.classList.remove('current', 'incorrect', 'correct');
            currentIndex--;
            characters[currentIndex].classList.remove('correct', 'incorrect');
            characters[currentIndex].classList.add('current');
        }
        return;
    }

    if (e.key === expectedChar) {
        currentCharSpan.classList.remove('current', 'incorrect');
        currentCharSpan.classList.add('correct');
    } else {
        currentCharSpan.classList.remove('current', 'correct');
        currentCharSpan.classList.add('incorrect');
        errors++;
    }

    currentIndex++;
    
    if (currentIndex < characters.length) {
        characters[currentIndex].classList.add('current');
        
        // Auto-scroll logic
        const areaRect = typingArea.getBoundingClientRect();
        const charRect = characters[currentIndex].getBoundingClientRect();
        if (charRect.bottom > areaRect.bottom) {
            typingArea.scrollTop += 40;
        }
    } else {
        endGame();
    }
    
    calculateStats();
}

function calculateStats() {
    if (timeElapsed === 0) return;

    // WPM: (correct characters / 5) / time in minutes
    const correctChars = typingArea.querySelectorAll('.char.correct').length;
    const wpm = Math.round((correctChars / 5) / (timeElapsed / 60));
    wpmDisplay.innerText = wpm;

    // Error Rate: (errors / total typed) * 100
    const totalTyped = currentIndex;
    const errorRate = totalTyped > 0 ? Math.round((errors / totalTyped) * 100) : 0;
    errorDisplay.innerText = errorRate;
}

function endGame() {
    pauseGame();
    startBtn.disabled = true;
    alert(`The madness consumes you. Your final score: ${wpmDisplay.innerText} WPM with an error rate of ${errorDisplay.innerText}%.`);
}

// --- Event Listeners ---

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);

// Ensure typing area is focused when clicked
typingArea.addEventListener('click', () => {
    if (isRunning) typingArea.focus();
});
