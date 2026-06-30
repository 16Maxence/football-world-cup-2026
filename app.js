let matchPredictData = {};
let rawCsvMatches = [];
let donutChartInstance = null;

// 1. Charger les deux fichiers (JSON et CSV) au démarrage
async function loadData() {
    try {
        // Charger le fichier JSON des prédictions
        const jsonResponse = await fetch('./predictions_modele.json');
        if (!jsonResponse.ok) throw new Error("JSON introuvable");
        matchPredictData = await jsonResponse.json();

        // Charger le fichier CSV des résultats réels
        const csvResponse = await fetch('./results.csv');
        if (!csvResponse.ok) throw new Error("CSV introuvable");
        const csvText = await csvResponse.text();
        
        parseCsvData(csvText);
        populateTeamA();
    } catch (error) {
        console.error("Erreur critique lors de l'initialisation :", error);
    }
}

// Analyseur CSV léger adapté pour "results.csv"
function parseCsvData(text) {
    const lines = text.split('\n');
    // En-tête attendu : date,home_team,away_team,home_score,away_score,tournament,city,country,neutral
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length >= 5) {
            // Ignorer les matchs pas encore joués (Marqués "NA")
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

// 2. Action au choix de l'équipe de gauche
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

// 3. Calculs et construction visuelle globale
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
    
    // Charger et injecter l'historique exact provenant du CSV
    chargerVraisScoresCsv(tA, tB);
}

// 4. Extraction et affichage des lignes de scores du CSV
function chargerVraisScoresCsv(tA, tB) {
    const listContainer = document.getElementById('matchHistoryList');
    listContainer.innerHTML = '';

    // Filtrer les matchs du CSV contenant les deux équipes concernées
    const matchsFiltres = rawCsvMatches.filter(m => 
        (m.home === tA && m.away === tB) || (m.home === tB && m.away === tA)
    );

    // Trier du plus récent au plus ancien
    matchsFiltres.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (matchsFiltres.length === 0) {
        listContainer.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:10px;">Aucun score disponible dans l\'historique.</div>';
        return;
    }

    // Afficher chaque confrontation réelle trouvée
    matchsFiltres.forEach(m => {
        let typeBarre = 'draw';
        
        // Déterminer la couleur de la bordure gauche par rapport à l'Équipe Gauche (tA)
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
