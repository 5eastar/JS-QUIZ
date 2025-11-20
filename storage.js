// LocalStorage management for pupil data

const STORAGE_KEY = 'quizApp_pupils';
const HISTORY_KEY = 'quizApp_history';

// Safe localStorage wrapper
const storage = {
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error reading ${key}:`, error);
            return null;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing ${key}:`, error);
            return false;
        }
    }
};

// Get all pupils
function getAllPupils() {
    return storage.get(STORAGE_KEY) || [];
}

// Add new pupil
function addPupil(name) {
    if (!name?.trim()) return null;
    
    const pupils = getAllPupils();
    const trimmedName = name.trim();
    
    // Check if pupil already exists (case-insensitive)
    if (pupils.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        return null;
    }
    
    const newPupil = {
        id: generateId(),
        name: trimmedName,
        createdAt: new Date().toISOString(),
        quizCount: 0
    };
    
    pupils.push(newPupil);
    storage.set(STORAGE_KEY, pupils);
    return newPupil;
}

// Get pupil by ID
function getPupilById(id) {
    const pupils = getAllPupils();
    return pupils.find(p => p.id === id);
}

// Update pupil quiz count
function updatePupilQuizCount(pupilId) {
    const pupils = getAllPupils();
    const pupil = pupils.find(p => p.id === pupilId);
    
    if (pupil) {
        pupil.quizCount++;
        storage.set(STORAGE_KEY, pupils);
    }
}

// Save quiz result to history
function saveQuizResult(pupilId, resultsData, config) {
    const history = getQuizHistory();
    
    const totalQuestions = resultsData.results.length;
    const correct = resultsData.results.filter(r => r.result === 'plus').length;
    
    const quizRecord = {
        id: generateId(),
        pupilId: pupilId,
        date: new Date().toISOString(),
        config: config,
        results: resultsData.results,
        totalTime: resultsData.totalTime,
        summary: {
            totalQuestions,
            correct,
            accuracy: ((correct / totalQuestions) * 100).toFixed(1)
        }
    };
    
    history.push(quizRecord);
    storage.set(HISTORY_KEY, history);
    
    // Update pupil's quiz count
    updatePupilQuizCount(pupilId);
}

// Get all quiz history
function getQuizHistory() {
    return storage.get(HISTORY_KEY) || [];
}

// Get quiz history for specific pupil
function getPupilHistory(pupilId) {
    const history = getQuizHistory();
    return history.filter(q => q.pupilId === pupilId);
}

// Delete pupil and their history
function deletePupil(pupilId) {
    // Remove pupil
    const pupils = getAllPupils().filter(p => p.id !== pupilId);
    storage.set(STORAGE_KEY, pupils);
    
    // Remove their quiz history
    const history = getQuizHistory().filter(q => q.pupilId !== pupilId);
    storage.set(HISTORY_KEY, history);
}

// Generate unique ID
function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

// Format date for display
function formatDate(isoString) {
    try {
        const date = new Date(isoString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    } catch (error) {
        return 'Invalid date';
    }
}   