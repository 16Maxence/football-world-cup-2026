let matchPredictData = {};
let rawCsvMatches = [];
let donutChartInstance = null;

// Tableaux de stockage pour détruire/recréer les graphiques proprement
let rankingCharts = {};

async function loadData() {
    try {
        const jsonResponse = await fetch('./predictions_modele.json');
        if (!jsonResponse.ok) throw new Error("JSON introuvable");
        matchPredictData = await jsonResponse.json();

        const csvResponse = await fetch('./results.csv');
        if (!csvResponse.ok) throw new Error("results.csv introuvable");
        const csvText = await csvResponse.text();
        parseCsvData(csvText);
        
        populateTeamA();

        const wcResponse = await fetch('./classement_historique_wc.csv');
        if (wcResponse.ok) {
            const wcText = await wcResponse.text();
            traiterEtAfficherDonneesWC(wcText);
        }
    } catch (error) {
        console.error("Erreur critique lors de l'initialisation :", error);
    }
}

function parseCsvData(text) {
    const lines = text.split('\n');
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length >= 5) {
            if (cols[3] === 'NA' || cols[4] === 'NA') continue;
            rawCsvMatches.push({
                date: cols[0].trim(),
                home: cols[1].trim(),
                away: cols[2].trim(),
                home_score: parseInt(cols[3]),
                away_score: parseInt(cols[4]),
                tournament: cols[5] ? cols[5].trim() : ''
            });
        }
    }
}

function populateTeamA() {
    const teams = new Set();
    Object.values(matchPredictData).forEach(match => {
        if(match.team_a) teams.add(match.team_a);
        if(match.team_b) teams.add(match.team_b);
    });
    const sortedTeams = Array.from(teams).sort();
    const selectA = document.getElementById('teamA');
    if (selectA) {
        selectA.innerHTML = '<option value="">Sélectionner Équipe</option>';
        sortedTeams.forEach(team => {
            let opt = document.createElement('option');
            opt.value = team; opt.textContent = team;
            selectA.appendChild(opt);
        });
    }
}

function switchTab(viewId, btnElement) {
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    btnElement.classList.add('active');
}

function chargerAdversaires() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');
    if (!grid || !selectB) return;
    grid.style.display = 'none';
    if (!tA) { selectB.innerHTML = '<option value="">Sélectionner Équipe</option>'; return; }
    const adversaires = new Set();
    Object.values(matchPredictData).forEach(match => {
        if (match.team_a === tA) adversaires.add(match.team_b);
        else if (match.team_b === tA) adversaires.add(match.team_a);
    });
    const sortedAdversaires = Array.from(adversaires).sort();
    selectB.innerHTML = '';
    sortedAdversaires.forEach(team => {
        let opt = document.createElement('option');
        opt.value = team; opt.textContent = team;
        selectB.appendChild(opt);
    });
    if (sortedAdversaires.length > 0) {
        selectB.value = sortedAdversaires[0];
        afficherResultats();
    }
}

function afficherResultats() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');
    if (!grid || !tA || !tB) return;
    let matchKey = `${tA}-${tB}`;
    let inverted = false;
    if (!matchPredictData[matchKey]) { matchKey = `${tB}-${tA}`; inverted = true; }
    const predictMatch = matchPredictData[matchKey];
    if (!predictMatch) { grid.style.display = 'none'; return; }
    grid.style.display = 'grid';
    const stats = predictMatch.stats;
    const totalMatchs = stats.total_history;
    document.getElementById('totalMatches').textContent = totalMatchs;
    const probWinA = inverted ? stats.prob_team2 : stats.prob_team1;
    const probWinB = inverted ? stats.prob_team1 : stats.prob_team2;
    const probDraw = stats.prob_draw;
    const countWinA = Math.round((probWinA / 100) * totalMatchs);
    const countWinB = Math.round((probWinB / 100) * totalMatchs);
    const countDraw = Math.max(0, totalMatchs - countWinA - countWinB);
    document.getElementById('barWinA').style.width = `${probWinA}%`;
    document.getElementById('barWinA').textContent = probWinA > 0 ? `${probWinA}%` : '';
    document.getElementById('barDraw').style.width = `${probDraw}%`;
    document.getElementById('barDraw').textContent = probDraw > 0 ? `${probDraw}%` : '';
    document.getElementById('barWinB').style.width = `${probWinB}%`;
    document.getElementById('barWinB').textContent = probWinB > 0 ? `${probWinB}%` : '';
    document.getElementById('lblWinA').textContent = `Victoire ${tA}`;
    document.getElementById('lblWinB').textContent = `Victoire ${tB}`;
    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
    chargerVraisScoresCsv(tA, tB);
}

function chargerVraisScoresCsv(tA, tB) {
    const listContainer = document.getElementById('matchHistoryList');
    listContainer.innerHTML = '';
    const matchsFiltres = rawCsvMatches.filter(m => (m.home === tA && m.away === tB) || (m.home === tB && m.away === tA));
    matchsFiltres.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (matchsFiltres.length === 0) { listContainer.innerHTML = '<div style="color:var(--text-muted); padding:10px;">Aucun score.</div>'; return; }
    matchsFiltres.forEach(m => {
        let typeBarre = 'draw';
        if (m.home === tA) {
            if (m.home_score > m.away_score) typeBarre = 'win';
            else if (m.home_score < m.away_score) typeBarre = 'loss';
        } else {
            if (m.away_score > m.home_score) typeBarre = 'win';
            else if (m.away_score < m.home_score) typeBarre = 'loss';
        }
        const item = document.createElement('div');
        item.className = `history-item ${typeBarre}`;
        item.innerHTML = `<div><div class="match-teams">${m.home} vs ${m.away}</div><div class="match-meta">${m.date.substring(0,4)} — ${m.tournament}</div></div><span class="match-score">${m.home_score} - ${m.away_score}</span>`;
        listContainer.appendChild(item);
    });
}

// MANAGEMENT DU CLASSEMENT ET DES GRAPHQUES TOP 10
function traiterEtAfficherDonneesWC(csvText) {
    const tbody = document.getElementById('rankingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const lines = csvText.split('\n');
    let listeEquipesCompletes = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (cols.length >= 10) {
            const indexRang = cols[0].trim();
            const equipe = cols[1].replace(/"/g, '').trim();
            const pj = parseInt(cols[2].trim()) || 0;
            const v = parseInt(cols[3].trim()) || 0;
            const n = parseInt(cols[4].trim()) || 0;
            const d = parseInt(cols[5].trim()) || 0;
            const bf = parseInt(cols[6].trim()) || 0;
            const bc = parseInt(cols[7].trim()) || 0;
            const db = parseInt(cols[8].trim()) || 0;
            const pts = parseInt(cols[9].trim()) || 0;
            const groupe = cols[11] ? cols[11].trim() : '—';
            const titres = cols[12] ? parseInt(cols[12]) : 0;

            const itemEquipe = { indexRang, equipe, pj, v, n, d, bf, bc, db, pts, groupe, titres };
            listeEquipesCompletes.push(itemEquipe);

            // Injection dynamique des lignes du tableau principal
            let etoilesHtml = titres > 0 ? `<span class="star-container">🏆 x${titres}</span>` : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="rank-col">#${indexRang}</td>
                <td class="align-left">
                    <div class="team-name-container">
                        <span>${equipe}</span> ${etoilesHtml}
                        <span class="group-badge">Gr. ${groupe}</span>
                    </div>
                </td>
                <td class="pts-col">${pts}</td>
                <td>${pj}</td>
                <td>${v}</td>
                <td>${n}</td>
                <td>${d}</td>
                <td class="hide-mobile">${bf}</td>
                <td class="hide-mobile">${bc}</td>
                <td style="font-weight:600; color:${db >= 0 ? '#2ecc71' : '#e74c3c'}">${db >= 0 ? '+' : ''}${db}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    // GENERATION DES GRAPHQUES TOP 10
    creerBarChart('chartTitres', 'Titres', [...listeEquipesCompletes].sort((a,b) => b.titres - a.titres).slice(0, 10), 'titres', '#f1c40f');
    creerBarChart('chartPoints', 'Points', [...listeEquipesCompletes].sort((a,b) => b.pts - a.pts).slice(0, 10), 'pts', '#3498db');
    creerBarChart('chartVictoires', 'Victoires', [...listeEquipesCompletes].sort((a,b) => b.v - a.v).slice(0, 10), 'v', '#2ecc71');
    creerBarChart('chartDiff', 'Diff.', [...listeEquipesCompletes].sort((a,b) => b.db - a.db).slice(0, 10), 'db', '#e67e22');
}

// Fonction générique pour créer un graphique à barres horizontales épuré
function creerBarChart(canvasId, labelLabel, dataList, objectKey, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (rankingCharts[canvasId]) rankingCharts[canvasId].destroy();

    rankingCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataList.map(d => d.equipe),
            datasets: [{
                label: labelLabel,
                data: dataList.map(d => d[objectKey]),
                backgroundColor: color,
                borderRadius: 4,
                barThickness: 12
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#152238', titleColor: '#fff', bodyColor: '#6b7c96' }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7c96', font: { size: 10 } } },
                y: { ticks: { color: '#ffffff', font: { size: 10, weight: 'bold' } }, grid: { display: false } }
            }
        }
    });
}

function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const ctx = document.getElementById('donutChart').getContext('2d');
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`Victoires ${teamA}`, 'Matchs nuls', `Victoires ${teamB}`],
            datasets: [{ data: [winA, draw, winB], backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c'], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#6b7c96', font: { size: 12 } } } },
            cutout: '70%'
        }
    });
}

window.onload = loadData;
