let matchPredictData = {};
let rawCsvMatches = [];
let donutChartInstance = null;

// 1. Initialisation de l'application
async function loadData() {
    try {
        const jsonResponse = await fetch('./predictions_modele.json');
        if (!jsonResponse.ok) throw new Error("JSON introuvable");
        matchPredictData = await jsonResponse.json();

        const csvResponse = await fetch('./results.csv');
        if (!csvResponse.ok) throw new Error("CSV introuvable");
        const csvText = await csvResponse.text();
        
        parseCsvData(csvText);
        populateTeamA();
        calculerEtAfficherClassement(); // Génère l'onglet Classement en arrière-plan
    } catch (error) {
        console.error("Erreur critique lors de l'initialisation :", error);
    }
}

// Analyseur CSV
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

// Remplir le premier sélecteur
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

// Système de changement d'onglets
function switchTab(viewId, btnElement) {
    // Désactiver toutes les sections et tous les boutons
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Activer l'onglet sélectionné
    document.getElementById(viewId).classList.add('active');
    btnElement.classList.add('active');
}

// 2. Gestion du filtrage H2H (Face à Face)
function chargerAdversaires() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');

    if (!grid || !selectB) return;
    grid.style.display = 'none';

    if (!tA) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
        return;
    }

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

    if (!matchPredictData[matchKey]) {
        matchKey = `${tB}-${tA}`;
        inverted = true;
    }

    const predictMatch = matchPredictData[matchKey];
    if (!predictMatch) {
        grid.style.display = 'none';
        return;
    }

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

    const matchsFiltres = rawCsvMatches.filter(m => 
        (m.home === tA && m.away === tB) || (m.home === tB && m.away === tA)
    );

    matchsFiltres.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (matchsFiltres.length === 0) {
        listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:10px;">Aucun score disponible.</div>';
        return;
    }

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
        item.innerHTML = `
            <div>
                <div class="match-teams">${m.home} vs ${m.away}</div>
                <div class="match-meta">${m.date.substring(0,4)} — ${m.tournament}</div>
            </div>
            <span class="match-score">${m.home_score} - ${m.away_score}</span>
        `;
        listContainer.appendChild(item);
    });
}

// 3. Nouveau système : Calculer dynamiquement le classement général du CSV
function calculerEtAfficherClassement() {
    const statsEquipes = {};

    rawCsvMatches.forEach(m => {
        if (!statsEquipes[m.home]) statsEquipes[m.home] = { j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0 };
        if (!statsEquipes[m.away]) statsEquipes[m.away] = { j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0 };

        statsEquipes[m.home].j += 1;
        statsEquipes[m.away].j += 1;
        statsEquipes[m.home].bp += m.home_score;
        statsEquipes[m.home].bc += m.away_score;
        statsEquipes[m.away].bp += m.away_score;
        statsEquipes[m.away].bc += m.home_score;

        if (m.home_score > m.away_score) {
            statsEquipes[m.home].v += 1;
            statsEquipes[m.home].pts += 3;
            statsEquipes[m.away].d += 1;
        } else if (m.home_score < m.away_score) {
            statsEquipes[m.away].v += 1;
            statsEquipes[m.away].pts += 3;
            statsEquipes[m.home].d += 1;
        } else {
            statsEquipes[m.home].n += 1;
            statsEquipes[m.home].pts += 1;
            statsEquipes[m.away].n += 1;
            statsEquipes[m.away].pts += 1;
        }
    });

    // Convertir en tableau et trier par points puis différence de buts
    const tableauTrie = Object.keys(statsEquipes).map(nom => ({
        name: nom,
        ...statsEquipes[nom],
        diff: statsEquipes[nom].bp - statsEquipes[nom].bc
    })).sort((a, b) => b.pts - a.pts || b.diff - a.diff);

    // Injecter dans le HTML (limité au Top 50 pour la performance, ajustable)
    const tbody = document.getElementById('rankingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    tableauTrie.slice(0, 50).forEach((team, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="rank-number">#${index + 1}</td>
            <td style="font-weight:bold;">${team.name}</td>
            <td>${team.j}</td>
            <td style="color:var(--text-muted); font-size:13px;">${team.v}W — ${team.n}D — ${team.d}L</td>
            <td>${team.bp}:${team.bc} (${team.diff >= 0 ? '+' : ''}${team.diff})</td>
            <td class="badge-points">${team.pts} pts</td>
        `;
        tbody.appendChild(tr);
    });
}

function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const ctx = document.getElementById('donutChart').getContext('2d');
    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`Victoires ${teamA}`, 'Matchs nuls', `Victoires ${teamB}`],
            datasets: [{
                data: [winA, draw, winB],
                backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#6b7c96', font: { size: 12 } } }
            },
            cutout: '70%'
        }
    });
}

window.onload = loadData;
