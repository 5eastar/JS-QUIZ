// File-based Storage Manager for Programs
// Stores programs as JSON files in the same directory as the app

const PROGRAMS_FILE = 'quiz-programs.json';
const PROGRAMS_KEY = 'quizApp_allPrograms'; // Keep localStorage as backup

// File storage implementation
const FileStorage = {
    // Check if we're running from a file:// URL (local file system)
    isFileSystem() {
        return window.location.protocol === 'file:';
    },

    // Save programs to a downloadable JSON file
    async exportToFile(programs) {
        try {
            const dataStr = JSON.stringify(programs, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = PROGRAMS_FILE;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error exporting programs:', error);
            return false;
        }
    },

    // Import programs from a JSON file
    async importFromFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const programs = JSON.parse(e.target.result);
                        resolve(programs);
                    } catch (error) {
                        reject(new Error('Invalid JSON file'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            };
            
            input.click();
        });
    },

    // Check if programs file exists in same directory (requires manual placement)
    async loadFromSameDirectory() {
        try {
            const response = await fetch(PROGRAMS_FILE);
            if (response.ok) {
                const programs = await response.json();
                console.log('Loaded programs from file');
                return programs;
            }
        } catch (error) {
            console.log('No programs file found in directory');
        }
        return null;
    }
};

// Initialize programs with file storage support
async function initializePrograms() {
    // Priority 1: Try to load from same directory (if file exists)
    const filePrograms = await FileStorage.loadFromSameDirectory();
    if (filePrograms && filePrograms.length > 0) {
        console.log('Using programs from file');
        // Also cache in localStorage for faster subsequent loads
        try {
            localStorage.setItem(PROGRAMS_KEY, JSON.stringify(filePrograms));
        } catch (e) {
            console.warn('Could not cache to localStorage');
        }
        return filePrograms;
    }
    
    // Priority 2: Check localStorage
    const stored = localStorage.getItem(PROGRAMS_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (error) {
            console.error('Error parsing stored programs:', error);
        }
    }
    
    // Priority 3: Initialize from built-in data
    const builtInPrograms = window.quizData?.programs || [];
    const initialPrograms = builtInPrograms.map(prog => ({
        ...prog,
        builtin: true,
        editable: true
    }));
    
    // Save to localStorage (will warn if quota exceeded but won't fail)
    try {
        localStorage.setItem(PROGRAMS_KEY, JSON.stringify(initialPrograms));
    } catch (e) {
        console.warn('Could not save to localStorage, file storage recommended');
    }
    
    return initialPrograms;
}

// Get all programs
async function getAllPrograms() {
    return await initializePrograms();
}

// Save all programs
async function saveAllPrograms(programs) {
    try {
        // Try localStorage first (for speed)
        try {
            localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
            console.log('✓ Saved to localStorage');
        } catch (localStorageError) {
            console.warn('localStorage full, using file storage only');
        }
        
        // Show file storage options
        const useFileStorage = confirm(
            '💾 Save programs to file?\n\n' +
            'YES: Download quiz-programs.json (unlimited storage)\n' +
            'NO: Keep in browser only (limited storage)\n\n' +
            'Recommended: Save to file for permanent storage on shared drive.'
        );
        
        if (useFileStorage) {
            const success = await FileStorage.exportToFile(programs);
            if (success) {
                alert(
                    '✓ Programs exported to quiz-programs.json\n\n' +
                    'IMPORTANT:\n' +
                    '1. Save the file in the same folder as index.html\n' +
                    '2. Name it exactly: quiz-programs.json\n' +
                    '3. The app will load from this file automatically\n\n' +
                    'This gives you unlimited storage!'
                );
                return true;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error saving programs:', error);
        alert('Error saving programs: ' + error.message);
        return false;
    }
}

// Import programs from file (manual import)
async function importPrograms() {
    try {
        const programs = await FileStorage.importFromFile();
        
        // Validate structure
        if (!Array.isArray(programs)) {
            throw new Error('Invalid programs file structure');
        }
        
        // Save to localStorage
        try {
            localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
        } catch (e) {
            console.warn('Could not cache imported programs');
        }
        
        return programs;
    } catch (error) {
        console.error('Error importing programs:', error);
        alert('Error importing programs: ' + error.message);
        return null;
    }
}

// Export programs to file (manual export)
async function exportPrograms() {
    try {
        const programs = await getAllPrograms();
        const success = await FileStorage.exportToFile(programs);
        
        if (success) {
            alert(
                '✓ Programs exported successfully!\n\n' +
                'File: quiz-programs.json\n\n' +
                'Place this file in the same folder as index.html\n' +
                'for automatic loading.'
            );
        }
        
        return success;
    } catch (error) {
        console.error('Error exporting programs:', error);
        alert('Error exporting programs: ' + error.message);
        return false;
    }
}

// Legacy function for backwards compatibility
async function getCustomPrograms() {
    const allPrograms = await getAllPrograms();
    return allPrograms.filter(p => p.custom === true);
}

// Make functions available globally
window.FileStorage = FileStorage;
window.initializePrograms = initializePrograms;
window.getAllPrograms = getAllPrograms;
window.saveAllPrograms = saveAllPrograms;
window.importPrograms = importPrograms;
window.exportPrograms = exportPrograms;
window.getCustomPrograms = getCustomPrograms;
