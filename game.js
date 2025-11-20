// Quiz state
let config = {};
let currentQuestion = 0;
let questions = [];
let results = [];
let correctionAttempts = 0;
let isInCorrection = false;
let clickCount = 0;
let clickTimer = null;

// Timer variables
let quizStartTime = null;
let questionStartTime = null;
let initialResponseTime = null;

// Current question text for sound repeat
let currentQuestionText = '';

// Store current options for reshuffling during corrections
let currentOptions = [];
let currentOptionImages = [];

// Speech synthesis
const synth = window.speechSynthesis;

// Initialize quiz
document.addEventListener('DOMContentLoaded', () => {
    try {
        config = JSON.parse(sessionStorage.getItem('quizConfig'));
        
        if (!config) {
            window.location.href = 'index.html';
            return;
        }
        
        setupTeacherButton();
        document.getElementById('begin-btn')?.addEventListener('click', startQuiz);
    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = 'index.html';
    }
});

// Start quiz
function startQuiz() {
    generateQuestions();
    quizStartTime = Date.now();
    
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    
    if (startScreen) startScreen.style.display = 'none';
    if (quizScreen) quizScreen.style.display = 'flex';
    
    setupSoundButton();
    updateQuestionCounter();
    showQuestion();
}

// Setup double-click teacher button
function setupTeacherButton() {
    const teacherBtn = document.getElementById('teacher-btn');
    if (!teacherBtn) return;
    
    teacherBtn.addEventListener('click', () => {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            showResults();
        }
    });
}

// Setup sound button to repeat instructions
function setupSoundButton() {
    const soundBtn = document.getElementById('sound-btn');
    if (!soundBtn) return;
    
    // Clone to remove old listeners
    const newSoundBtn = soundBtn.cloneNode(true);
    soundBtn.replaceWith(newSoundBtn);
    
    newSoundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        let textToSpeak = currentQuestionText;
        
        // Fallback to DOM if variable is empty
        if (!textToSpeak) {
            const questionTextElement = document.getElementById('question-text');
            if (questionTextElement) {
                textToSpeak = questionTextElement.textContent;
            }
        }
        
        if (textToSpeak) {
            speak(textToSpeak);
            
            // Visual feedback
            newSoundBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                newSoundBtn.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

// Generate questions array
function generateQuestions() {
    const program = quizData.programs[config.programIndex];
    const targets = config.selectedStimuli.map(i => program.stimulus[i]);
    
    questions = [];
    for (let i = 0; i < config.maxQuestions; i++) {
        const target = targets[i % targets.length];
        questions.push({
            target,
            originalTarget: target
        });
    }
}

// Show current question
function showQuestion() {
    const question = questions[currentQuestion];
    const program = quizData.programs[config.programIndex];
    
    // Start question timer (only on first attempt)
    if (!isInCorrection) {
        questionStartTime = Date.now();
    }
    
    updateQuestionCounter();
    
    // Set question text
    currentQuestionText = `Find ${question.target.name}`;
    const questionTextElement = document.getElementById('question-text');
    if (questionTextElement) {
        questionTextElement.textContent = currentQuestionText;
    }
    
    // Speak the question
    speak(currentQuestionText);
    
    // Generate options (or reshuffle existing ones for corrections)
    if (!isInCorrection) {
        // First attempt - generate new options
        currentOptions = generateOptions(question.target, program);
    } else {
        // Correction - reshuffle the same options
        const combined = currentOptions.map((opt, i) => ({ opt, img: currentOptionImages[i] }));
        const shuffledCombined = shuffleArray(combined);
        currentOptions = shuffledCombined.map(item => item.opt);
        currentOptionImages = shuffledCombined.map(item => item.img);
  }

    
    displayOptions(currentOptions);
    
    // Clear feedback
    resetFeedback();
}

// Update question counter
function updateQuestionCounter() {
    const counter = document.getElementById('question-counter');
    if (counter) {
        counter.textContent = `Question ${currentQuestion + 1} / ${questions.length}`;
    }
}

// Generate options array with target and distractors
function generateOptions(target, program) {
    const options = [target];
    const otherStimuli = program.stimulus.filter(s => s !== target);
    // Shuffle and pick random distractors
    const shuffled = shuffleArray([...otherStimuli]);
    const numDistractors = Math.min(config.fieldSize - 1, shuffled.length);
    options.push(...shuffled.slice(0, numDistractors));
    const finalOptions = shuffleArray(options);
    currentOptionImages = finalOptions.map(option => {
        if (option.images && option.images.length > 0) {
            const randomIndex = Math.floor(Math.random() * option.images.length);
            return option.images[randomIndex];
        }
        return null;
    });
    // Shuffle final options
    return finalOptions;
}

// Shuffle array utility function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Display options on screen
function displayOptions(options) {
    const grid = document.getElementById('options-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    grid.setAttribute('data-size', config.fieldSize);
    
    const question = questions[currentQuestion];
    
    options.forEach((option, index) => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.dataset.optionName = option.name;
        
        if (option.name === question.target.name) {
            card.dataset.isTarget = 'true';
        }
        const imageSrc = currentOptionImages[index];
        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            card.appendChild(img);
        }

        // Add click handler
        card.addEventListener('click', () => handleAnswer(option, card));
        
        grid.appendChild(card);
    });
}

// Handle answer selection
function handleAnswer(selected, card) {
    const question = questions[currentQuestion];
    const isCorrect = selected === question.target;
    
    // Disable all cards
    document.querySelectorAll('.option-card').forEach(c => {
        c.classList.add('disabled');
    });
    
    if (isCorrect) {
        handleCorrectAnswer(card);
    } else {
        handleIncorrectAnswer(card);
    }
}

// Handle correct answer
function handleCorrectAnswer(card) {
    card.classList.add('correct');
    
    // Calculate response time
    let responseTime = 0;
    if (!isInCorrection && questionStartTime) {
        responseTime = (Date.now() - questionStartTime) / 1000;
        initialResponseTime = responseTime;
    } else if (isInCorrection && initialResponseTime !== null) {
        responseTime = initialResponseTime;
    }
    
    if (!isInCorrection) {
        setFeedback('Well done!', 'correct-feedback');
        speak('Well done!');
        soundFX.playCorrect();
        
        results.push({
            questionNumber: currentQuestion + 1,
            target: questions[currentQuestion].originalTarget.name,
            result: 'plus',
            responseTime: responseTime
        });
    } else {
        const targetName = questions[currentQuestion].target.name;
        setFeedback(`That's correct!`, 'correct-feedback');
        speak(`That's correct, this is ${targetName}`);
        
        results.push({
            questionNumber: currentQuestion + 1,
            target: questions[currentQuestion].originalTarget.name,
            result: 'minus',
            responseTime: responseTime
        });
    }
    
    setTimeout(() => {
        moveToNextQuestion();
    }, 3000);
}

// Handle incorrect answer
function handleIncorrectAnswer(wrongCard) {
    wrongCard.classList.add('incorrect');
    
    if (!isInCorrection && questionStartTime && initialResponseTime === null) {
        initialResponseTime = (Date.now() - questionStartTime) / 1000;
    }
    
    setFeedback('Incorrect', 'incorrect-feedback');
    speak('Incorrect');
    soundFX.playIncorrect();
    
    setTimeout(() => {
        showCorrection();
    }, 2000);
}

// Show correction
function showCorrection() {
    const question = questions[currentQuestion];
    
    // Highlight correct answer
    const correctCard = document.querySelector('.option-card[data-is-target="true"]');
    if (correctCard) {
        correctCard.classList.add('correct');
    }
    
    correctionAttempts++;
    isInCorrection = true;
    
    setFeedback(`This is ${question.target.name}`, '');
    
    if (correctionAttempts >= 3) {
        speak(`This is ${question.target.name}. Let's move on.`);
        
        setTimeout(() => {
            const responseTime = initialResponseTime || 0;
            
            results.push({
                questionNumber: currentQuestion + 1,
                target: questions[currentQuestion].originalTarget.name,
                result: 'minus',
                responseTime: responseTime
            });
            moveToNextQuestion();
        }, 3500);
    } else {
        speak(`This is ${question.target.name}. Let's try again.`);
        
        setTimeout(() => {
            showQuestion(); // This will now reshuffle the same options
        }, 3500);
    }
}

// Move to next question
function moveToNextQuestion() {
    resetFeedback();
    correctionAttempts = 0;
    isInCorrection = false;
    initialResponseTime = null;
    questionStartTime = null;
    currentQuestion++;
    currentOptions = []; // Clear stored options for next question
    
    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        endQuiz();
    }
}

// End quiz
function endQuiz() {
    const totalQuizTime = quizStartTime ? (Date.now() - quizStartTime) / 1000 : 0;
    
    const quizScreen = document.getElementById('quiz-screen');
    const endScreen = document.getElementById('end-screen');
    
    if (quizScreen) quizScreen.style.display = 'none';
    if (endScreen) endScreen.style.display = 'flex';
    
    speak("You're finished! Good job!");
    
    const resultsData = {
        results: results,
        totalTime: totalQuizTime
    };
    
    sessionStorage.setItem('quizResults', JSON.stringify(resultsData));
    sessionStorage.setItem('quizResultsSaved', 'false');
}

// Show results (teacher view)
function showResults() {
    const totalQuizTime = quizStartTime ? (Date.now() - quizStartTime) / 1000 : 0;
    
    const resultsData = {
        results: results,
        totalTime: totalQuizTime
    };
    
    sessionStorage.setItem('quizResults', JSON.stringify(resultsData));
    
    if (config.pupilId && results.length > 0 && typeof saveQuizResult === 'function') {
        try {
            const alreadySaved = sessionStorage.getItem('quizResultsSaved') === 'true';
            if (!alreadySaved) {
                saveQuizResult(config.pupilId, resultsData, config);
                sessionStorage.setItem('quizResultsSaved', 'true');
            }
        } catch (error) {
            console.error('Error saving quiz result:', error);
        }
    }
    
    window.location.href = 'results.html';
}

// Helper: set feedback text and class
function setFeedback(text, className) {
    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) {
        feedbackElement.textContent = text;
        feedbackElement.className = `feedback ${className}`;
    }
}

// Helper: clear feedback area
function resetFeedback() {
    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) {
        feedbackElement.textContent = '';
        feedbackElement.className = 'feedback';
    }
}

// Text-to-speech function
function speak(text) {
    if (!text || !synth) return;
    
    try {
        // Cancel any ongoing speech
        synth.cancel();
        
        // Small delay to ensure cancel completes
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.lang = 'en-GB';
            
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
            };
            
            synth.speak(utterance);
        }, 50);
    } catch (error) {
        console.error('Speech error:', error);
    }
}