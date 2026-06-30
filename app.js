let matchData = {};
let donutChartInstance = null;

// 1. Charger les données du fichier JSON au démarrage
async function loadData() {
    try {
        const response = await fetch('data.json');
        matchData = await response.json();
        populateTeams();
    } catch (error) {
        console.error("Erreur de chargement du JSON :", error);
    }
}

// 2. Remplir dynamiquement les sélecteurs avec la liste triée des pays
function populateTeams() {
    const teams = new Set();
    Object.values(matchData).forEach(match => {
        if(match.team_a) teams.add(match.team_a);
        if(match.team_b) teams.add(match.team_b);
    });

    const sortedTeams = Array.from(teams).sort();
    const selectA = document.getElementById('teamA');
    const selectB = document.getElementById('teamB');

    sortedTeams.forEach(team => {
        let optA = document.createElement('option');
        optA.value = team; optA.textContent = team;
        selectA.appendChild(optA);

        let optB = document.createElement('option');
        optB.value = team; optB.textContent = team;
        selectB.appendChild(optB);
    });
}

// 3. Fonction déclenchée dès qu'un sélecteur change
function mettreAJourMatch() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');

    // Si les deux sélections ne sont pas prêtes ou identiques, on cache l'affichage
    if (!tA || !tB || tA === tB) {
        grid.style.display = 'none';
        return;
    }

    // Trouver la clé dans un sens ou dans l'autre
    let matchKey = `${tA}-${tB}`;
    let inverted = false;

    if (!matchData[matchKey]) {
        matchKey = `${tB}-${tA}`;
        inverted = true;
    }

    const match = matchData[matchKey];

    if (!match) {
        alert("Aucun historique disponible pour cette rencontre.");
        grid.style.display = 'none';
        return;
    }

    // Afficher la grille principale
    grid.style.display = 'grid';

    // Extraction des statistiques clés
    const stats = match.stats;
    const totalMatchs = stats.total_history;
    document.getElementById('totalMatches').textContent = totalMatchs;

    // Réorganisation des données selon l'ordre sélectionné à l'écran (Gauche vs Droite)
    const probWinA = inverted ? stats.prob_team2 : stats.prob_team1;
    const probWinB = inverted ? stats.prob_team1 : stats.prob_team2;
    const probDraw = stats.prob_draw;

    // Simulation des données de l'historique pour le Donut (basé sur tes pourcentages historiques)
    const countWinA = Math.round((probWinA / 100) * totalMatchs);
    const countWinB = Math.round((probWinB / 100) * totalMatchs);
    const countDraw = Math.max(0, totalMatchs - countWinA - countWinB);

    // Mettre à jour la barre de probabilité horizontale du bas
    document.getElementById('barWinA').style.width = `${probWinA}%`;
    document.getElementById('barWinA').textContent = `${probWinA}%`;
    document.getElementById('barDraw').style.width = `${probDraw}%`;
    document.getElementById('barDraw').textContent = `${probDraw}%`;
    document.getElementById('barWinB').style.width = `${probWinB}%`;
    document.getElementById('barWinB').textContent = `${probWinB}%`;

    document.getElementById('lblWinA').textContent = `Victoire ${tA}`;
    document.getElementById('lblWinB').textContent = `Victoire ${tB}`;

    // Mettre à jour ou créer le graphique Donut (Chart.js)
    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
}

// 4. Gestionnaire de graphique Chart.js
function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const ctx = document.getElementById('donutChart').getContext('2d');

    // Si un graphique existe déjà, on le détruit pour pouvoir dessiner le nouveau proprement
    if (donutChartInstance) {
        donutChartInstance.destroy();
    }

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
                legend: {
                    position: 'right',
                    labels: {
                        color: '#6b7c96',
                        font: { size: 12 }
                    }
                }
            },
            cutout: '70%' // Épaisseur de l'anneau pour faire l'effet de la capture
        }
    });
}

// Lancement automatique du script
window.onload = loadData;
