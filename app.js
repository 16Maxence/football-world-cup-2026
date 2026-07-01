let modelPredictions = {};
let historicalCsvData = [];
let donutChartInstance = null;
let rankingChartInstance = null;

const top5Data = [
    { rank: 1, team: "ARGENTINA", percentage: "18.4%", flag: "🇦🇷" },
    { rank: 2, team: "BRAZIL", percentage: "16.8%", flag: "🇧🇷" },
    { rank: 3, team: "FRANCE", percentage: "14.2%", flag: "🇫🇷" },
    { rank: 4, team: "SPAIN", percentage: "11.5%", flag: "🇪🇸" },
    { rank: 5, team: "GERMANY", percentage: "9.7%", flag: "🇩🇪" }
];

// Arbre Miroir Eurosport (100% symétrique avec blocs SF gauche et droit branchés)
const bracketStructure = {
    left: {
        R16: [
            { id: "L_R16_1", home: "Germany", away: "Paraguay", next: "L_QF_1", slot: "home" },
            { id: "L_R16_2", home: "France", away: "Sweden", next: "L_QF_1", slot: "away" },
            { id: "L_R16_3", home: "South Africa", away: "Canada", next: "L_QF_2", slot: "home" },
            { id: "L_R16_4", home: "Netherlands", away: "Morocco", next: "L_QF_2", slot: "away" },
            { id: "L_R16_5", home: "Portugal", away: "Croatia", next: "L_QF_3", slot: "home" },
            { id: "L_R16_6", home: "Spain", away: "Austria", next: "L_QF_3", slot: "away" },
            { id: "L_R16_7", home: "United States", away: "Bosnia and Herzegovina", next: "L_QF_4", slot: "home" },
            { id: "L_R16_8", home: "Belgium", away: "Senegal", next: "L_QF_4", slot: "away" }
        ],
        QF: [
            { id: "L_QF_1", home: "", away: "", next: "L_SF_1", slot: "home" },
            { id: "L_QF_2", home: "", away: "", next: "L_SF_1", slot: "away" },
            { id: "L_QF_3", home: "", away: "", next: "L_SF_2", slot: "home" },
            { id: "L_QF_4", home: "", away: "", next: "L_SF_2", slot: "away" }
        ],
        SF: [
            { id: "L_SF_1", home: "", away: "", next: "F_FINAL", slot: "home" },
            { id: "L_SF_2", home: "", away: "", next: "F_FINAL", slot: "home" } 
        ]
    },
    right: {
        R16: [
            { id: "R_R16_1", home: "Brazil", away: "Japan", next: "R_QF_1", slot: "home" },
            { id: "R_R16_2", home: "Ivory Coast", away: "Norway", next: "R_QF_1", slot: "away" },
            { id: "R_R16_3", home: "Mexico", away: "Ecuador", next: "R_QF_2", slot: "home" },
            { id: "R_R16_4", home: "England", away: "DR Congo", next: "R_QF_2", slot: "away" },
            { id: "R_R16_5", home: "Argentina", away: "Cape Verde Islands", next: "R_QF_3", slot: "home" },
            { id: "R_R16_6", home: "Australia", away: "Egypt", next: "R_QF_3", slot: "away" },
            { id: "R_R16_7", home: "Switzerland", away: "Algeria", next: "R_QF_4", slot: "home" },
            { id: "R_R16_8", home: "Colombia", away: "Ghana", next: "R_QF_4", slot: "away" }
        ],
        QF: [
            { id: "R_QF_1", home: "", away: "", next: "R_SF_1", slot: "home" },
            { id: "R_QF_2", home: "", away: "", next: "R_SF_1", slot: "away" },
            { id: "R_QF_3", home: "", away: "", next: "R_SF_2", slot: "home" },
            { id: "R_QF_4", home: "", away: "", next: "R_SF_2", slot: "away" }
        ],
        SF: [
            { id: "R_SF_1", home: "", away: "", next: "F_FINAL", slot: "away" },
            { id: "R_SF_2", home: "", away: "", next: "F_FINAL", slot: "away" }
        ]
    },
    final: {
        F_FINAL: { id: "F_FINAL", home: "", away: "" }
    }
};

window.onload = async function() {
    initTop5Widget();
    await loadProjectData();
};

function initTop5Widget() {
    const container = document.getElementById('top5Widget');
    if (!container) return;
    container.innerHTML = '';
    top5Data.forEach(item => {
        const card = document.createElement('div');
        card.className = `top5-card ${item.rank === 1 ? 'rank-1' : ''}`;
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:900; color:${item.rank === 1 ? '#dfb75c' : '#6b7c96'}">#${item.rank}</span>
                <span style="font-size:18px;">${item.flag}</span>
                <span style="font-weight:700; font-size:13px; letter-spacing:0.5px;">${item.team}</span>
            </div>
            <span style="font-weight:800; color:#dfb75c; font-size:13px; text-shadow:0 0 5px rgba(223,183,92,0.3);">${item.percentage}</span>
        `;
        container.appendChild(card);
    });
}

async function loadProjectData() {
    try {
        const resPred = await fetch('./predictions_modele.json');
        modelPredictions = await resPred.json();

        const resCsv = await fetch('./results.csv');
        const csvText = await resCsv.text();
        parseHistoricalCsv(csvText);

        populateSelectorTeamA();
        buildRankingChart();
        await parseAndBuild2026RealStats();

    } catch (err) {
        console.error("Erreur d'initialisation :", err);
    }
}

function parseHistoricalCsv(text) {
    const lines = text.split('\n');
    historicalCsvData = [];
    for(let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const c = lines[i].split(',');
        if (c.length >= 5 && c[3] !== 'NA' && c[4] !== 'NA') {
            historicalCsvData.push({
                date: c[0].trim(), home: c[1].trim(), away: c[2].trim(),
                home_score: parseInt(c[3]), away_score: parseInt(c[4]),
                tournament: c[5] ? c[5].trim() : ''
            });
        }
    }
}

function buildRankingChart() {
    const ctx = document.getElementById('canvasRanking').getContext('2d');
    const sortedTeamsForChart = [...top5Data, 
        { team: "SPAIN", percentage: "11.5%" },
        { team: "GERMANY", percentage: "9.7%" },
        { team: "PORTUGAL", percentage: "8.1%" },
        { team: "NETHERLANDS", percentage: "7.4%" },
        { team: "ENGLAND", percentage: "6.9%" },
        { team: "ITALY", percentage: "5.2%" },
        { team: "BELGIUM", percentage: "4.8%" }
    ];

    const labels = sortedTeamsForChart.map(t => t.team);
    const dataVals = sortedTeamsForChart.map(t => parseFloat(t.percentage));

    if (rankingChartInstance) rankingChartInstance.destroy();
    rankingChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Indice de Performance Évalué (%)',
                data: dataVals,
                backgroundColor: labels.map((_, i) => i === 0 ? '#dfb75c' : '#1a2942'),
                borderColor: '#384f73',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#6b7c96' } } },
            scales: {
                x: { ticks: { color: '#6b7c96' }, grid: { display: false } },
                y: { ticks: { color: '#6b7c96' }, grid: { color: '#131c2e' } }
            }
        }
    });
}

function populateSelectorTeamA() {
    const list = new Set();
    Object.values(modelPredictions).forEach(m => {
        if(m.team_a) list.add(m.team_a);
        if(m.team_b) list.add(m.team_b);
    });
    const selectA = document.getElementById('selectTeamA');
    selectA.innerHTML = '<option value="">Choisir Équipe A</option>';
    Array.from(list).sort().forEach(t => {
        let o = document.createElement('option');
        o.value = t; o.textContent = t;
        selectA.appendChild(o);
    });
}

function updateOpponents() {
    const tA = document.getElementById('selectTeamA').value;
    const selectB = document.getElementById('selectTeamB');
    document.getElementById('simulationDashboard').style.display = 'none';
    if(!tA) { selectB.innerHTML = ''; return; }

    const opps = new Set();
    Object.values(modelPredictions).forEach(m => {
        if(m.team_a === tA) opps.add(m.team_b);
        else if(m.team_b === tA) opps.add(m.team_a);
    });
    
    selectB.innerHTML = '';
    Array.from(opps).sort().forEach(t => {
        let o = document.createElement('option');
        o.value = t; o.textContent = t;
        selectB.appendChild(o);
    });
    if(opps.size > 0) runSimulation();
}

function runSimulation() {
    const tA = document.getElementById('selectTeamA').value;
    const tB = document.getElementById('selectTeamB').value;
    const dash = document.getElementById('simulationDashboard');
    if(!tA || !tB) { dash.style.display = 'none'; return; }

    dash.style.display = 'grid';
    let key = `${tA}-${tB}`;
    let inv = false;
    if(!modelPredictions[key]) { key = `${tB}-${tA}`; inv = true; }

    const data = modelPredictions[key];
    if(!data) return;

    document.getElementById('labelTeamA').textContent = tA;
    document.getElementById('labelTeamB').textContent = tB;

    const pA = inv ? data.stats.prob_team2 : data.stats.prob_team1;
    const pB = inv ? data.stats.prob_team1 : data.stats.prob_team2;
    const pD = data.stats.prob_draw;

    document.getElementById('barA').style.width = `${pA}%`;
    document.getElementById('barA').textContent = pA > 5 ? `${pA}%` : '';
    document.getElementById('barDraw').style.width = `${pD}%`;
    document.getElementById('barDraw').textContent = pD > 5 ? `${pD}%` : '';
    document.getElementById('barB').style.width = `${pB}%`;
    document.getElementById('barB').textContent = pB > 5 ? `${pB}%` : '';

    const avgA = inv ? data.stats.avg_goals_t2 : data.stats.avg_goals_t1;
    const avgB = inv ? data.stats.avg_goals_t1 : data.stats.avg_goals_t2;
    document.getElementById('avgGoalsSummary').textContent = `${tA} (${Number(avgA).toFixed(1)}) — ${tB} (${Number(avgB).toFixed(1)})`;

    buildDonutChart(tA, tB, pA, pD, pB);

    const logs = document.getElementById('historyLogs');
    logs.innerHTML = '';
    const filtered = historicalCsvData.filter(m => (m.home === tA && m.away === tB) || (m.home === tB && m.away === tA));
    if(filtered.length === 0) {
        logs.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:15px;">Aucune confrontation passée.</div>';
        return;
    }
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(m => {
        let state = 'draw';
        if(m.home === tA && m.home_score > m.away_score) state = 'win';
        if(m.home === tA && m.home_score < m.away_score) state = 'loss';
        if(m.away === tA && m.away_score > m.home_score) state = 'win';
        if(m.away === tA && m.away_score < m.home_score) state = 'loss';

        const item = document.createElement('div');
        item.className = `history-item ${state}`;
        item.innerHTML = `
            <div>
                <div style="font-weight:700; font-size:13px;">${m.home} vs ${m.away}</div>
                <div style="font-size:11px; color:var(--text-muted);">${m.date.substring(0,4)} — ${m.tournament}</div>
            </div>
            <div style="font-weight:800; font-family:monospace; font-size:14px;">${m.home_score} - ${m.away_score}</div>
        `;
        logs.appendChild(item);
    });
}

function buildDonutChart(tA, tB, pA, pD, pB) {
    const ctx = document.getElementById('canvasDonut').getContext('2d');
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [tA, 'Match Nul', tB],
            datasets: [{ data: [pA, pD, pB], backgroundColor: ['#00b894', '#fdcb6e', '#d63031'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#6b7c96' } } },
            cutout: '75%'
        }
    });
}

function changeTab(id, btn) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

async function parseAndBuild2026RealStats() {
    let realList = [];
    try {
        const res = await fetch('./real_results_2026.csv');
        if(!res.ok) throw new Error();
        const text = await res.text();
        text.split('\n').forEach((line, idx) => {
            if(idx === 0 || !line.trim()) return;
            const cols = line.split(',');
            if(cols.length >= 5) {
                realList.push({
                    home: cols[1].trim(), away: cols[2].trim(),
                    home_score: parseInt(cols[3]), away_score: parseInt(cols[4])
                });
            }
        });
    } catch(e) {
        document.getElementById('backtestListMatches').innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">Fichier real_results_2026.csv manquant.</div>';
        return;
    }

    let success = 0, error = 0;
    const container = document.getElementById('backtestListMatches');
    container.innerHTML = '';

    realList.forEach(m => {
        let key = `${m.home}-${m.away}`;
        let inv = false;
        if(!modelPredictions[key]) { key = `${m.away}-${m.home}`; inv = true; }

        let predText = "Inconnu";
        let matchClass = 'badge-error';
        let matchResultText = 'Échec';

        const pred = modelPredictions[key];
        if(pred) {
            const p1 = inv ? pred.stats.prob_team2 : pred.stats.prob_team1;
            const p2 = inv ? pred.stats.prob_team1 : pred.stats.prob_team2;
            const pd = pred.stats.prob_draw;

            let fav = 'DRAW';
            if(p1 > p2 && p1 > pd) fav = 'HOME_WIN';
            if(p2 > p1 && p2 > pd) fav = 'AWAY_WIN';

            let realOutcome = 'DRAW';
            if(m.home_score > m.away_score) realOutcome = 'HOME_WIN';
            if(m.home_score < m.away_score) realOutcome = 'AWAY_WIN';

            predText = `Attendu : ${fav === 'HOME_WIN' ? m.home : (fav === 'AWAY_WIN' ? m.away : 'Nul')}`;
            if(fav === realOutcome) {
                matchClass = 'badge-success'; matchResultText = 'Succès'; success++;
            } else { error++; }
        } else { error++; }

        const r = document.createElement('div');
        r.className = 'match-row-card';
        r.innerHTML = `
            <div>
                <span style="font-size:11px; color:var(--text-muted);">MONDIAL 2026 — ANALYSE</span>
                <div style="font-weight:700; font-size:15px; margin-top:3px;">${m.home} <span style="color:#dfb75c;">${m.home_score} - ${m.away_score}</span> ${m.away}</div>
            </div>
            <div style="font-size:13px; font-weight:500;">${predText}</div>
            <span class="badge ${matchClass}">${matchResultText}</span>
        `;
        container.appendChild(r);
    });

    const total = success + error;
    document.getElementById('valAccuracy').textContent = total > 0 ? `${((success / total) * 100).toFixed(1)}%` : '0%';
    document.getElementById('valSuccess').textContent = success;
    document.getElementById('valError').textContent = error;

    document.getElementById('syncStatusBar').textContent = "Système d'analyse prédictive synchronisé — Données de match à jour";

    computeAndRenderMirrorBracket(realList);
}

function computeAndRenderMirrorBracket(realMatches) {
    const findScore = (h, a) => realMatches.find(m => (m.home === h && m.away === a) || (m.home === a && m.away === h));
    const workingTree = JSON.parse(JSON.stringify(bracketStructure));

    ['left', 'right'].forEach(side => {
        // Huitièmes
        workingTree[side].R16.forEach(match => {
            const res = findScore(match.home, match.away);
            if(res) {
                const isInv = (res.home !== match.home);
                match.home_score = isInv ? res.away_score : res.home_score;
                match.away_score = isInv ? res.home_score : res.away_score;
                match.winner = match.home_score > match.away_score ? match.home : match.away;

                if(match.winner && match.next) {
                    const nextMatch = workingTree[side].QF.find(q => q.id === match.next);
                    if(nextMatch) nextMatch[match.slot] = match.winner;
                }
            }
        });

        // Quarts
        workingTree[side].QF.forEach(match => {
            const res = findScore(match.home, match.away);
            if(res) {
                const isInv = (res.home !== match.home);
                match.home_score = isInv ? res.away_score : res.home_score;
                match.away_score = isInv ? res.home_score : res.away_score;
                match.winner = match.home_score > match.away_score ? match.home : match.away;

                if(match.winner && match.next) {
                    const nextMatch = workingTree[side].SF.find(s => s.id === match.next);
                    if(nextMatch) nextMatch[match.slot] = match.winner;
                }
            }
        });

        // Demi-finales (SF)
        workingTree[side].SF.forEach(match => {
            const res = findScore(match.home, match.away);
            if(res) {
                const isInv = (res.home !== match.home);
                match.home_score = isInv ? res.away_score : res.home_score;
                match.away_score = isInv ? res.home_score : res.away_score;
                match.winner = match.home_score > match.away_score ? match.home : match.away;

                if(match.winner && match.next) {
                    workingTree.final[match.next][match.slot] = match.winner;
                }
            }
        });
    });

    // Finale
    const finalMatch = workingTree.final.F_FINAL;
    const finalRes = findScore(finalMatch.home, finalMatch.away);
    if(finalRes) {
        const isInv = (finalRes.home !== finalMatch.home);
        finalMatch.home_score = isInv ? finalRes.away_score : finalRes.home_score;
        finalMatch.away_score = isInv ? finalRes.home_score : finalRes.away_score;
        finalMatch.winner = finalMatch.home_score > finalMatch.away_score ? finalMatch.home : finalMatch.away;
    }

    renderDOMColumn(workingTree.left.R16, 'col_R16_Left');
    renderDOMColumn(workingTree.left.QF, 'col_QF_Left');
    renderDOMColumn(workingTree.left.SF, 'col_SF_Left');

    renderDOMColumn(workingTree.right.R16, 'col_R16_Right');
    renderDOMColumn(workingTree.right.QF, 'col_QF_Right');
    renderDOMColumn(workingTree.right.SF, 'col_SF_Right');

    const finalZone = document.getElementById('col_Final_Zone');
    finalZone.innerHTML = '';
    finalZone.appendChild(buildMatchCardDOM(finalMatch));
}

function renderDOMColumn(matchArray, columnId) {
    const col = document.getElementById(columnId);
    if (!col) return;
    const titleHtml = col.querySelector('.column-title').outerHTML;
    col.innerHTML = titleHtml;
    matchArray.forEach(m => {
        col.appendChild(buildMatchCardDOM(m));
    });
}

function buildMatchCardDOM(m) {
    const box = document.createElement('div');
    box.className = 'matchup-box';

    const hWin = m.winner && m.winner === m.home ? 'winner-highlight' : '';
    const aWin = m.winner && m.winner === m.away ? 'winner-highlight' : '';

    box.innerHTML = `
        <div class="team-row ${hWin}">
            <span class="team-name">${m.home || 'À déterminer'}</span>
            <span class="team-score">${m.home_score !== undefined ? m.home_score : '-'}</span>
        </div>
        <div class="team-row ${aWin}">
            <span class="team-name">${m.away || 'À déterminer'}</span>
            <span class="team-score">${m.away_score !== undefined ? m.away_score : '-'}</span>
        </div>
    `;
    return box;
}
