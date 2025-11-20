// Load and display results
document.addEventListener('DOMContentLoaded', () => {
    const resultsData = JSON.parse(sessionStorage.getItem('quizResults'));
    const config = JSON.parse(sessionStorage.getItem('quizConfig'));

    if (!resultsData || !resultsData.results || resultsData.results.length === 0) {
        document.querySelector('.results-container').innerHTML = `
            <h1>No Results Available</h1>
            <button class="btn-primary" onclick="window.location.href='index.html'">
                Back to Menu
            </button>
        `;
        return;
    }

    const alreadySaved = sessionStorage.getItem('quizResultsSaved') === 'true';
    if (!alreadySaved && config && config.pupilId && typeof saveQuizResult === 'function') {
        try {
            saveQuizResult(config.pupilId, resultsData, config);
            sessionStorage.setItem('quizResultsSaved', 'true');
        } catch (error) {
            console.error('Error saving quiz result:', error);
        }
    }
    
    displaySummary(resultsData.results, resultsData.totalTime);
    displayQuestionResults(resultsData.results);
    displayTargetSummary(resultsData.results);
    
    // Setup export button
    document.getElementById('export-btn').addEventListener('click', () => {
        exportToCSV(resultsData);
    });
});

// Display summary statistics
function displaySummary(results, totalTime) {
    const totalQuestions = results.length;
    const plusCount = results.filter(r => r.result === 'plus').length;
    const accuracy = ((plusCount / totalQuestions) * 100).toFixed(1);
    
    // Calculate average response time (only for recorded times)
    const validTimes = results.filter(r => r.responseTime && r.responseTime > 0);
    const avgResponseTime = validTimes.length > 0 
        ? (validTimes.reduce((sum, r) => sum + r.responseTime, 0) / validTimes.length).toFixed(2)
        : '0.00';
    
    // Format total time
    const formattedTotalTime = formatTime(totalTime);
    
    const summaryHTML = `
        <h2>Overall Performance</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${plusCount}/${totalQuestions}</div>
                <div class="summary-label">Correct</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${accuracy}%</div>
                <div class="summary-label">Accuracy</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${avgResponseTime}s</div>
                <div class="summary-label">Avg Response</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formattedTotalTime}</div>
                <div class="summary-label">Total Time</div>
            </div>
        </div>
    `;
    
    document.getElementById('summary').innerHTML = summaryHTML;
}

// Display question-by-question results
function displayQuestionResults(results) {
    const tbody = document.querySelector('#questions-table tbody');
    tbody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        const scoreClass = result.result === 'plus' ? 'plus' : 'minus';
        const scoreSymbol = result.result === 'plus' ? '+' : '−';
        const responseTime = result.responseTime ? result.responseTime.toFixed(2) + 's' : 'N/A';
        
        row.innerHTML = `
            <td>${result.questionNumber}</td>
            <td>${result.target}</td>
            <td><span class="score-badge ${scoreClass}">${scoreSymbol}</span></td>
            <td>${responseTime}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Display target summary
function displayTargetSummary(results) {
    const tbody = document.querySelector('#targets-table tbody');
    tbody.innerHTML = '';
    
    // Group by target
    const targetGroups = {};
    results.forEach(result => {
        if (!targetGroups[result.target]) {
            targetGroups[result.target] = [];
        }
        targetGroups[result.target].push(result);
    });
    
    // Create rows for each target
    Object.keys(targetGroups).sort().forEach(target => {
        const targetResults = targetGroups[target];
        const correct = targetResults.filter(r => r.result === 'plus').length;
        const total = targetResults.length;
        
        // Calculate average response time for this target
        const validTimes = targetResults.filter(r => r.responseTime && r.responseTime > 0);
        const avgTime = validTimes.length > 0
            ? (validTimes.reduce((sum, r) => sum + r.responseTime, 0) / validTimes.length).toFixed(2)
            : 'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${target}</strong></td>
            <td>${correct}/${total}</td>
            <td>${avgTime}${avgTime !== 'N/A' ? 's' : ''}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Format time in MM:SS format
function formatTime(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Export results to CSV
function exportToCSV(resultsData) {
    const results = resultsData.results;
    const totalTime = resultsData.totalTime;
    
    // Calculate summary stats
    const totalQuestions = results.length;
    const plusCount = results.filter(r => r.result === 'plus').length;
    const accuracy = ((plusCount / totalQuestions) * 100).toFixed(1);
    const validTimes = results.filter(r => r.responseTime && r.responseTime > 0);
    const avgResponseTime = validTimes.length > 0 
        ? (validTimes.reduce((sum, r) => sum + r.responseTime, 0) / validTimes.length).toFixed(2)
        : '0.00';
    
    // Build CSV content
    let csv = 'Quiz Results Export\n\n';
    
    // Summary section
    csv += 'SUMMARY\n';
    csv += 'Total Questions,' + totalQuestions + '\n';
    csv += 'Correct Responses,' + plusCount + '\n';
    csv += 'Accuracy,' + accuracy + '%\n';
    csv += 'Average Response Time,' + avgResponseTime + 's\n';
    csv += 'Total Time,' + formatTime(totalTime) + '\n';
    csv += '\n';
    
    // Question results
    csv += 'QUESTION RESULTS\n';
    csv += 'Question,Target,Score,Response Time (s)\n';
    results.forEach(result => {
        const score = result.result === 'plus' ? '+' : '-';
        const time = result.responseTime ? result.responseTime.toFixed(2) : 'N/A';
        csv += `${result.questionNumber},"${result.target}",${score},${time}\n`;
    });
    csv += '\n';
    
    // Target summary
    csv += 'RESULTS BY TARGET\n';
    csv += 'Target,Correct,Total,Accuracy,Avg Response Time (s)\n';
    
    const targetGroups = {};
    results.forEach(result => {
        if (!targetGroups[result.target]) {
            targetGroups[result.target] = [];
        }
        targetGroups[result.target].push(result);
    });
    
    Object.keys(targetGroups).sort().forEach(target => {
        const targetResults = targetGroups[target];
        const correct = targetResults.filter(r => r.result === 'plus').length;
        const total = targetResults.length;
        const targetAccuracy = ((correct / total) * 100).toFixed(1);
        
        const validTimes = targetResults.filter(r => r.responseTime && r.responseTime > 0);
        const avgTime = validTimes.length > 0
            ? (validTimes.reduce((sum, r) => sum + r.responseTime, 0) / validTimes.length).toFixed(2)
            : 'N/A';
        
        csv += `"${target}",${correct},${total},${targetAccuracy}%,${avgTime}\n`;
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const date = new Date();
    const filename = `quiz_results_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}