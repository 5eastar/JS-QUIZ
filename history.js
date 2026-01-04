document.addEventListener('DOMContentLoaded', () => {
    const pupilId = sessionStorage.getItem('viewPupilId');
    
    if (!pupilId) {
        window.location.href = 'index.html';
        return;
    }
    
    const pupil = getPupilById(pupilId);
    if (!pupil) {
        window.location.href = 'index.html';
        return;
    }
    
    displayPupilHistory(pupil);
    
    // Setup delete button
    document.getElementById('delete-pupil-btn').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete all data for ${pupil.name}? This cannot be undone.`)) {
            deletePupil(pupilId);
            alert('Pupil data deleted');
            window.location.href = 'index.html';
        }
    });
});

function displayPupilHistory(pupil) {
    document.getElementById('pupil-name').textContent = `${pupil.name} - History`;
    
    const history = getPupilHistory(pupil.id);
    
    if (history.length === 0) {
        document.getElementById('history-list').innerHTML = '<p>No quiz history yet.</p>';
        return;
    }
    
    // Calculate overall stats
    const totalQuizzes = history.length;
    const totalQuestions = history.reduce((sum, q) => sum + q.summary.totalQuestions, 0);
    const totalCorrect = history.reduce((sum, q) => sum + q.summary.correct, 0);
    const overallAccuracy = ((totalCorrect / totalQuestions) * 100).toFixed(1);
    
    // Display summary
    const summaryHTML = `
        <h2>Overall Statistics</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${totalQuizzes}</div>
                <div class="summary-label">Total Quizzes</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${totalCorrect}/${totalQuestions}</div>
                <div class="summary-label">Total Correct</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${overallAccuracy}%</div>
                <div class="summary-label">Overall Accuracy</div>
            </div>
        </div>
    `;
    document.getElementById('history-summary').innerHTML = summaryHTML;
    
    // Display quiz list
    let historyHTML = '';
    history.reverse().forEach((quiz, index) => {
        const allPrograms = getAllPrograms();
        const programName = allPrograms[quiz.config.programIndex]?.name || 'Unknown Program';
        historyHTML += `
            <div class="history-item">
                <h3>Quiz ${history.length - index} - ${formatDate(quiz.date)}</h3>
                <p><strong>Program:</strong> ${programName}</p>
                <p><strong>Score:</strong> ${quiz.summary.correct}/${quiz.summary.totalQuestions} (${quiz.summary.accuracy}%)</p>
                <p><strong>Duration:</strong> ${formatTime(quiz.totalTime)}</p>
                <button class="btn-link" onclick="viewQuizDetails('${quiz.id}')">View Details</button>
            </div>
        `;
    });
    
    document.getElementById('history-list').innerHTML = historyHTML;
}

function viewQuizDetails(quizId) {
    const history = getQuizHistory();
    const quiz = history.find(q => q.id === quizId);
    
    if (quiz) {
        const resultsData = {
            results: quiz.results,
            totalTime: quiz.totalTime
        };
        sessionStorage.setItem('quizResults', JSON.stringify(resultsData));
        window.location.href = 'results.html';
    }
}

function formatTime(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
