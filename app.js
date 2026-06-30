let matchPredictData = {};
let rawCsvMatches = [];
let donutChartInstance = null;

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

        // CHARGEMENT DU NOUVEAU CLASSEMENT HISTORIQUE WC
        const wcResponse = await fetch('./classement_historique_wc.csv');
        if (wcResponse.ok) {
            const wcText = await wcResponse.text();
            afficherVraiClassementWC(wcText);
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

// ROUTINE DE RENDU DU NOUVEAU TABLEAU (IMAGE 80E65E)
function afficherVraiClassementWC(csvText) {
    const tbody = document.getElementById('rankingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const lines = csvText.split('\n');
    
    // Entêtes attendus : ,equipe,PJ,V,N,D,BF,BC,DB,PTS,taux_V,groupe,titres,finales,annees_titres
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Utilisation d'une regex pour isoler correctement les virgules (notamment pour la liste d'années de titres)
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (cols.length >= 10) {
            const indexRang = cols[0].trim();
            const equipe = cols[1].replace(/"/g, '').trim();
            const pj = cols[2].trim();
            const v = cols[3].trim();
            const n = cols[4].trim();
            const d = cols[5].trim();
            const bf = cols[6].trim();
            const bc = cols[7].trim();
            const db = cols[8].trim();
            const pts = cols[9].trim();
            const groupe = cols[11] ? cols[11].trim() : '—';
            const titres = cols[12] ? parseInt(cols[12]) : 0;

            // Fabrique des étoiles s'il y a des titres de champion
            let etoilesHtml = '';
            if (titres > 0) {
                etoilesHtml = `<span class="star-container">🏆 x${titres}</span>`;
            }

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
                <td style="font-weight:600; color:${parseInt(db) >= 0 ? '#2ecc71' : '#e74c3c'}">${parseInt(db) >= 0 ? '+' : ''}${db}</td>
            `;
            tbody.appendChild(tr);
        }
    }
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
