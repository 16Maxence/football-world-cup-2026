let matchPredictData = {};
let rawCsvMatches = [];
let donutChartInstance = null;
let rankingCharts = {};

// Chargement initial des ressources locales
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

        // Affiche le Top 5 horizontal sous le titre
        genererTop5Vainqueurs();
        
        // Initialise l'onglet de comparaison modèle/réalité et le Bracket
        loadApiBacktestData();

    } catch (error) {
        console.error("Erreur critique lors de l'initialisation :", error);
    }
}

// Génère et insère dynamiquement les badges du Top 5
function genererTop5Vainqueurs() {
    const top5Data = [
        { rang: 1, equipe: "ARGENTINA", prob: "18.4%", logo: "🇦🇷" },
        { rang: 2, equipe: "BRAZIL", prob: "16.8%", logo: "🇧🇷" },
        { rang: 3, equipe: "FRANCE", prob: "14.2%", logo: "🇫🇷" },
        { rang: 4, equipe: "SPAIN", prob: "11.5%", logo: "🇪🇸" },
        { rang: 5, equipe: "GERMANY", prob: "9.7%", logo: "🇩🇪" }
    ];

    const container = document.getElementById('top5Container');
    if (!container) return;
    
    container.innerHTML = ''; 

    top5Data.forEach(item => {
        const borderGold = item.rang === 1 ? 'border: 1px solid #bf953f; background: rgba(191, 149, 63, 0.08);' : 'border: 1px solid #334155;';
        const badge = document.createElement('div');
        badge.style.cssText = `
            flex: 1;
            min-width: 165px;
            background-color: #1e293b;
            padding: 10px 14px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ${borderGold}
        `;
        
        badge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 900; color: ${item.rang === 1 ? '#f1c40f' : 'var(--text-muted)'}; font-size: 13px;">#${item.rang}</span>
                <span style="font-size: 16px;">${item.logo}</span>
                <span style="font-weight: bold; font-size: 13px; color: #ffffff; letter-spacing: 0.5px;">${item.equipe}</span>
            </div>
            <span style="font-weight: 800; color: var(--accent-yellow); font-size: 13px;">${item.prob}</span>
        `;
        container.appendChild(badge);
    });
}

function parseCsvData(text) {
    rawCsvMatches = [];
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

    const goalsContainer = document.getElementById('goalsContainer');
    if (goalsContainer) {
        goalsContainer.style.display = 'block';
        const avgA = inverted ? stats.avg_goals_t2 : stats.avg_goals_t1;
        const avgB = inverted ? stats.avg_goals_t1 : stats.avg_goals_t2;
        document.getElementById('lblGoalTeamA').textContent = tA;
        document.getElementById('lblGoalTeamB').textContent = tB;
        document.getElementById('avgGoalsA').textContent = Number(avgA).toFixed(1);
        document.getElementById('avgGoalsB').textContent = Number(avgB).toFixed(1);
    }

    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
    chargerVraisScoresCsv(tA, tB);
}

function chargerVraisScoresCsv(tA, tB) {
    const listContainer = document.getElementById('matchHistoryList');
    listContainer.innerHTML = '';
    const matchsFiltres = rawCsvMatches.filter(m => (m.home === tA && m.away === tB) || (m.home === tB && m.away === tA));
    matchsFiltres.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (matchsFiltres.length === 0) { listContainer.innerHTML = '<div style="color:var(--text-muted); padding:10px;">Aucun score historique.</div>'; return; }
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

function MettreAJourBadgeStatut(statut) {
    const maintenant = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('syncTimeStatus');
    if (el) el.textContent = `Mode : ${statut} à ${maintenant}`;
}

function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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

// -------------------------------------------------------------------------
// ONGLET MODÈLE VS RÉALITÉ (STRICTE 1N2 EN ANGLAIS)
// -------------------------------------------------------------------------
async function loadApiBacktestData() {
    const container = document.getElementById('backtestMatchesContainer');
    if (!container) return;

    let realMatches = [];

    try {
        const response = await fetch('./real_results_2026.csv');
        if (!response.ok) throw new Error("Fichier real_results_2026.csv introuvable.");
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',');
            if (cols.length >= 5) {
                realMatches.push({
                    date: cols[0].trim(),
                    home: cols[1].trim(), // Anglais (ex: Mexico)
                    away: cols[2].trim(), // Anglais (ex: South Africa)
                    home_score: parseInt(cols[3].trim()),
                    away_score: parseInt(cols[4].trim())
                });
            }
        }
    } catch (err) {
        console.error("Erreur de chargement des résultats 2026 :", err);
        container.innerHTML = `<div style="color:var(--text-muted); padding:20px; text-align:center;">Fichier 'real_results_2026.csv' manquant ou incorrect.</div>`;
        return;
    }

    container.innerHTML = '';
    let success = 0, error = 0;

    realMatches.forEach(item => {
        const homeEN = item.home;
        const awayEN = item.away;
        const homeScore = item.home_score;
        const awayScore = item.away_score;

        let realOutcome = 'DRAW';
        if (homeScore > awayScore) realOutcome = 'HOME_WIN';
        if (homeScore < awayScore) realOutcome = 'AWAY_WIN';

        let key = `${homeEN}-${awayEN}`;
        let isInverted = false;
        
        if (!matchPredictData[key]) {
            key = `${awayEN}-${homeEN}`;
            isInverted = true;
        }

        const pred = matchPredictData[key];
        let badgeClass = 'status-error';
        let badgeTxt = 'Échec';
        let predTxt = 'Modèle non calculé';

        if (pred) {
            const probT1 = isInverted ? pred.stats.prob_team2 : pred.stats.prob_team1;
            const probT2 = isInverted ? pred.stats.prob_team1 : pred.stats.prob_team2;
            const probD  = pred.stats.prob_draw;

            let modelFavorite = 'DRAW';
            if (probT1 > probT2 && probT1 > probD) modelFavorite = 'HOME_WIN';
            if (probT2 > probT1 && probT2 > probD) modelFavorite = 'AWAY_WIN';

            predTxt = `Attendu : ${modelFavorite === 'HOME_WIN' ? homeEN : (modelFavorite === 'AWAY_WIN' ? awayEN : 'Match Nul')} (${Math.max(probT1, probT2, probD)}%)`;

            if (modelFavorite === realOutcome) {
                badgeClass = 'status-success'; badgeTxt = 'Succès'; success++;
            } else {
                badgeClass = 'status-error'; badgeTxt = 'Échec'; error++;
            }
        } else {
            predTxt = "Attendu : Équilibré / Inconnu";
            error++;
        }

        const card = document.createElement('div');
        card.className = 'backtest-match-card';
        card.innerHTML = `
            <div style="flex: 1;">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Mondial 2026 — Réel</span>
                <div style="font-size: 16px; font-weight: bold; margin-top: 4px;">${homeEN} <span style="color: var(--accent-yellow);">${homeScore} - ${awayScore}</span> ${awayEN}</div>
            </div>
            <div style="flex: 1; text-align: center; border-left: 1px solid #2c3e50; border-right: 1px solid #2c3e50; padding: 0 15px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Prédiction du Modèle</div>
                <div style="font-weight: 500; margin-top: 4px; font-size: 13px;">${predTxt}</div>
            </div>
            <div style="flex: 0; padding-left: 20px; text-align: right;">
                <span class="status-badge ${badgeClass}">${badgeTxt}</span>
            </div>
        `;
        container.appendChild(card);
    });

    const totalCalculated = success + error;
    const accuracyPct = totalCalculated > 0 ? ((success / totalCalculated) * 100).toFixed(1) : 0;

    if (document.getElementById('globalAccuracy')) document.getElementById('globalAccuracy').textContent = `${accuracyPct}%`;
    if (document.getElementById('accuracySub')) document.getElementById('accuracySub').textContent = `Sur ${totalCalculated} matchs terminés`;
    if (document.getElementById('countSuccess')) document.getElementById('countSuccess').textContent = success;
    if (document.getElementById('countError')) document.getElementById('countError').textContent = error;
    
    MettreAJourBadgeStatut("Résultats réels locaux (FIFA 2026)");

    // Lancement de la génération automatique du Bracket
    generateAndFillBracket(realMatches);
}

// -------------------------------------------------------------------------
// LOGIQUE DE BRACKET DYNAMIQUE ET AUTOMATIQUE (PHASE FINALE EN ANGLAIS)
// -------------------------------------------------------------------------
const initialBracketMatches = [
    // Bloc Gauche de l'arbre
    { id: "R16_1", home: "Germany", away: "Paraguay", nextMatch: "QF_1", nextSlot: "home" },
    { id: "R16_2", home: "France", away: "Sweden", nextMatch: "QF_1", nextSlot: "away" },
    { id: "R16_3", home: "South Africa", away: "Canada", nextMatch: "QF_2", nextSlot: "home" },
    { id: "R16_4", home: "Netherlands", away: "Morocco", nextMatch: "QF_2", nextSlot: "away" },
    { id: "R16_5", home: "Portugal", away: "Croatia", nextMatch: "QF_3", nextSlot: "home" },
    { id: "R16_6", home: "Spain", away: "Austria", nextMatch: "QF_3", nextSlot: "away" },
    { id: "R16_7", home: "United States", away: "Bosnia and Herzegovina", nextMatch: "QF_4", nextSlot: "home" },
    { id: "R16_8", home: "Belgium", away: "Senegal", nextMatch: "QF_4", nextSlot: "away" },
    
    // Bloc Droite de l'arbre
    { id: "R16_9", home: "Brazil", away: "Japan", nextMatch: "QF_5", nextSlot: "home" },
    { id: "R16_10", home: "Ivory Coast", away: "Norway", nextMatch: "QF_5", nextSlot: "away" },
    { id: "R16_11", home: "Mexico", away: "Ecuador", nextMatch: "QF_6", nextSlot: "home" },
    { id: "R16_12", home: "England", away: "DR Congo", nextMatch: "QF_6", nextSlot: "away" },
    { id: "R16_13", home: "Argentina", away: "Cape Verde Islands", nextMatch: "QF_7", nextSlot: "home" },
    { id: "R16_14", home: "Australia", away: "Egypt", nextMatch: "QF_7", nextSlot: "away" },
    { id: "R16_15", home: "Switzerland", away: "Algeria", nextMatch: "QF_8", nextSlot: "home" },
    { id: "R16_16", home: "Colombia", away: "Ghana", nextMatch: "QF_8", nextSlot: "away" }
];

function generateAndFillBracket(realMatchesList) {
    const container = document.querySelector('.bracket-tournament');
    if (!container) return;

    const structure = {
        R16: { title: "Huitièmes", matches: JSON.parse(JSON.stringify(initialBracketMatches)) },
        QF: { title: "Quarts", matches: [
            { id: "QF_1", home: "", away: "", nextMatch: "SF_1", nextSlot: "home" },
            { id: "QF_2", home: "", away: "", nextMatch: "SF_1", nextSlot: "away" },
            { id: "QF_3", home: "", away: "", nextMatch: "SF_2", nextSlot: "home" },
            { id: "QF_4", home: "", away: "", nextMatch: "SF_2", nextSlot: "away" },
            { id: "QF_5", home: "", away: "", nextMatch: "SF_3", nextSlot: "home" },
            { id: "QF_6", home: "", away: "", nextMatch: "SF_3", nextSlot: "away" },
            { id: "QF_7", home: "", away: "", nextMatch: "SF_4", nextSlot: "home" },
            { id: "QF_8", home: "", away: "", nextMatch: "SF_4", nextSlot: "away" }
        ]},
        SF: { title: "Demi-finales", matches: [
            { id: "SF_1", home: "", away: "", nextMatch: "F", nextSlot: "home" },
            { id: "SF_2", home: "", away: "", nextMatch: "F", nextSlot: "away" },
            { id: "SF_3", home: "", away: "", nextMatch: "F_2", nextSlot: "home" },
            { id: "SF_4", home: "", away: "", nextMatch: "F_2", nextSlot: "away" }
        ]},
        F: { title: "Finale", matches: [
            { id: "F_FINAL", home: "", away: "" }
        ]}
    };

    function findRealScore(teamA, teamB) {
        if (!teamA || !teamB) return null;
        return realMatchesList.find(m => 
            (m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA)
        );
    }

    const roundsKeys = ['R16', 'QF', 'SF', 'F'];

    roundsKeys.forEach(roundKey => {
        structure[roundKey].matches.forEach(match => {
            const result = findRealScore(match.home, match.away);
            
            if (result) {
                const isHomeInverted = (result.home !== match.home);
                match.home_score = isHomeInverted ? result.away_score : result.home_score;
                match.away_score = isHomeInverted ? result.home_score : result.away_score;
                
                let winner = "";
                if (match.home_score > match.away_score) winner = match.home;
                else if (match.away_score > match.home_score) winner = match.away;

                match.winner = winner;

                if (winner && match.nextMatch) {
                    let targetRound = roundKey === 'R16' ? 'QF' : (roundKey === 'QF' ? 'SF' : 'F');
                    let targetMatchId = match.nextMatch;
                    
                    if (targetMatchId === 'F_2') { targetMatchId = 'F_FINAL'; match.nextSlot = 'away'; }
                    else if (targetMatchId === 'F') { targetMatchId = 'F_FINAL'; match.nextSlot = 'home'; }

                    const nextMatchObj = structure[targetRound].matches.find(m => m.id === targetMatchId);
                    if (nextMatchObj) {
                        nextMatchObj[match.nextSlot] = winner;
                    }
                }
            }
        });
    });

    container.innerHTML = "";
    roundsKeys.forEach(roundKey => {
        const roundData = structure[roundKey];
        const roundColumn = document.createElement('div');
        roundColumn.className = 'bracket-round';
        
        const title = document.createElement('div');
        title.className = 'bracket-round-title';
        title.textContent = roundData.title;
        roundColumn.appendChild(title);

        roundData.matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'bracket-matchup';

            const homeWinClass = match.winner && match.winner === match.home ? 'winner' : '';
            const awayWinClass = match.winner && match.winner === match.away ? 'winner' : '';

            matchCard.innerHTML = `
                <div class="bracket-team ${homeWinClass}">
                    <span class="bracket-team-name">${match.home || "À déterminer"}</span>
                    <span class="bracket-score">${match.home_score !== undefined ? match.home_score : "-"}</span>
                </div>
                <div class="bracket-team ${awayWinClass}">
                    <span class="bracket-team-name">${match.away || "À déterminer"}</span>
                    <span class="bracket-score">${match.away_score !== undefined ? match.away_score : "-"}</span>
                </div>
            `;
            roundColumn.appendChild(matchCard);
        });

        container.appendChild(roundColumn);
    });
}

window.onload = loadData;
