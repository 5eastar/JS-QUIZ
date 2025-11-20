let selectedPupilId = null;

// Initialize menu on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPupils();
    loadPrograms();
    setupEventListeners();
});

// Load pupils into dropdown
function loadPupils() {
    const pupils = getAllPupils();
    const pupilSelect = document.getElementById('pupil-select');
    
    // Clear existing options except first
    pupilSelect.innerHTML = '<option value="">-- Select Pupil --</option>';
    
    pupils.forEach(pupil => {
        const option = document.createElement('option');
        option.value = pupil.id;
        option.textContent = pupil.name;
        pupilSelect.appendChild(option);
    });
}

// Load programs into dropdown
function loadPrograms() {
    const programSelect = document.getElementById('program-select');
    
    quizData.programs.forEach((program, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = program.name;
        programSelect.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    const pupilSelect = document.getElementById('pupil-select');
    const addPupilBtn = document.getElementById('add-pupil-btn');
    const newPupilInput = document.getElementById('new-pupil-name');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const programSelect = document.getElementById('program-select');
    const fieldSizeInput = document.getElementById('field-size');
    const maxQuestionsInput = document.getElementById('max-questions');
    const startBtn = document.getElementById('start-btn');
    
    pupilSelect.addEventListener('change', handlePupilSelect);
    addPupilBtn.addEventListener('click', handleAddPupil);
    newPupilInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddPupil();
    });
    viewHistoryBtn.addEventListener('click', viewPupilHistory);
    programSelect.addEventListener('change', handleProgramChange);
    fieldSizeInput.addEventListener('input', validateNumberInput);
    maxQuestionsInput.addEventListener('input', validateNumberInput);
    fieldSizeInput.addEventListener('change', updateStartButton);
    maxQuestionsInput.addEventListener('change', updateStartButton);
    startBtn.addEventListener('click', startQuiz);
}

// Validate number inputs
function validateNumberInput(e) {
    const input = e.target;
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    let value = parseInt(input.value);
    
    if (isNaN(value) || value < min) {
        input.value = min;
    } else if (value > max) {
        input.value = max;
    }
    
    updateStartButton();
}

// Handle pupil selection
function handlePupilSelect(e) {
    const pupilId = e.target.value;
    const pupilInfo = document.getElementById('pupil-info');
    
    if (pupilId === '') {
        pupilInfo.style.display = 'none';
        selectedPupilId = null;
        updateStartButton();
        return;
    }
    
    const pupil = getPupilById(pupilId);
    if (pupil) {
        selectedPupilId = pupil.id;
        document.getElementById('selected-pupil-name').textContent = pupil.name;
        document.getElementById('pupil-quiz-count').textContent = pupil.quizCount;
        pupilInfo.style.display = 'block';
        
        // Clear new pupil input
        document.getElementById('new-pupil-name').value = '';
    }
    
    updateStartButton();
}

// Handle add new pupil
function handleAddPupil() {
    const input = document.getElementById('new-pupil-name');
    const name = input.value.trim();
    
    if (name === '') {
        alert('Please enter a pupil name');
        return;
    }
    
    const newPupil = addPupil(name);
    
    if (!newPupil) {
        alert('A pupil with this name already exists');
        return;
    }
    
    // Reload pupils and select the new one
    loadPupils();
    document.getElementById('pupil-select').value = newPupil.id;
    handlePupilSelect({ target: { value: newPupil.id } });
    input.value = '';
}

// View pupil history
function viewPupilHistory() {
    if (!selectedPupilId) return;
    
    sessionStorage.setItem('viewPupilId', selectedPupilId);
    window.location.href = 'history.html';
}

// Handle program selection change
function handleProgramChange(e) {
    const programIndex = e.target.value;
    const stimulusGroup = document.getElementById('stimulus-group');
    const stimulusList = document.getElementById('stimulus-list');
    
    if (programIndex === '') {
        stimulusGroup.style.display = 'none';
        updateStartButton();
        return;
    }
    
    // Show stimulus selection
    stimulusGroup.style.display = 'block';
    stimulusList.innerHTML = '';
    
    // Load stimuli for selected program
    const program = quizData.programs[programIndex];
    program.stimulus.forEach((stim, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `stim-${index}`;
        checkbox.value = index;
        checkbox.addEventListener('change', handleStimulusChange);
        
        const label = document.createElement('label');
        label.htmlFor = `stim-${index}`;
        label.textContent = stim.name;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        stimulusList.appendChild(div);
    });
    
    updateStartButton();
}

// Handle stimulus checkbox changes
function handleStimulusChange() {
    const checkboxes = document.querySelectorAll('#stimulus-list input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    
    // Limit to 5 selections
    if (checked.length > 5) {
        this.checked = false;
        return;
    }
    
    // Update counter
    document.getElementById('selected-count').textContent = checked.length;
    updateStartButton();
}

// Update start button state
function updateStartButton() {
    const programSelect = document.getElementById('program-select');
    const checkboxes = document.querySelectorAll('#stimulus-list input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const fieldSize = parseInt(document.getElementById('field-size').value);
    const maxQuestions = parseInt(document.getElementById('max-questions').value);
    const startBtn = document.getElementById('start-btn');
    
    startBtn.disabled = !selectedPupilId || programSelect.value === '' || checked.length === 0;
}

// Start quiz with selected options
function startQuiz() {
    if (!selectedPupilId) {
        alert('Please select a pupil');
        return;
    }
    
    const programIndex = document.getElementById('program-select').value;
    const fieldSize = document.getElementById('field-size').value;
    const maxQuestions = document.getElementById('max-questions').value;
    const checkboxes = document.querySelectorAll('#stimulus-list input[type="checkbox"]:checked');
    const selectedStimuli = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    // Store quiz configuration in sessionStorage
    const config = {
        pupilId: selectedPupilId,
        programIndex: parseInt(programIndex),
        selectedStimuli,
        fieldSize: fieldSize,
        maxQuestions: maxQuestions
    };
    
    sessionStorage.setItem('quizConfig', JSON.stringify(config));
    window.location.href = 'game.html';
}