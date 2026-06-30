let matchData = {};
let donutChartInstance = null;

// 1. Charger le JSON au démarrage
async function loadData() {
    try {
        const response = await fetch('predictions_modele.json');
        matchData = await response.json();
        populateTeamA();
    } catch (error) {
        console.error("Erreur critique lors du chargement du fichier JSON :", error);
    }
}

// Remplir le premier sélecteur (Gauche)
function populateTeamA() {
    const teams = new Set();
    Object.values(matchData).forEach(match => {
        if(match.team_a) teams.add(match.team_a);
        if(match.team_b) teams.add(match.team_b);
    });

    const sortedTeams = Array.from(teams).sort();
    const selectA = document.getElementById('teamA');
    
    if (selectA) {
        selectA.innerHTML = '<option value="">Sélectionner Équipe</option>';
        sortedTeams.forEach(team => {
            let opt = document.createElement('option');
            opt.value = team; 
            opt.textContent = team;
            selectA.appendChild(opt);
        });
    }
    
    const selectB = document.getElementById('teamB');
    if (selectB) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
    }
}

// 2. Filtrer l'équipe de droite et forcer l'affichage du premier élément trouvé
function chargerAdversaires() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');

    if (!grid || !selectB) return;

    // Masquer la grille en attendant la configuration
    grid.style.display = 'none';

    if (!tA) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
        return;
    }

    const adversaires = new Set();

    Object.values(matchData).forEach(match => {
        if (match.team_a === tA) {
            adversaires.add(match.team_b);
        } else if (match.team_b === tA) {
            adversaires.add(match.team_a);
        }
    });

    const sortedAdversaires = Array.from(adversaires).sort();
    selectB.innerHTML = '';
    
    sortedAdversaires.forEach(team => {
        let opt = document.createElement('option');
        opt.value = team; 
        opt.textContent = team;
        selectB.appendChild(opt);
    });

    // Sélectionne automatiquement le premier adversaire et affiche les résultats directement
    if (sortedAdversaires.length > 0) {
        selectB.value = sortedAdversaires[0];
        afficherResultats();
    }
}

// 3. Traiter les données et générer l'UI sans crash
function afficherResultats() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');

    if (!grid) return;
    if (!tA || !tB) {
        grid.style.display = 'none';
        return;
    }

    let matchKey = `${tA}-${tB}`;
    let inverted = false;

    if (!matchData[matchKey]) {
        matchKey = `${tB}-${tA}`;
        inverted = true;
    }

    const match = matchData[matchKey];
    if (!match) {
        grid.style.display = 'none';
        return;
    }

    // Afficher la grille
    grid.style.display = 'grid';

    const stats = match.stats;
    const totalMatchs = stats.total_history;
    
    document.getElementById('totalMatches').textContent = totalMatchs;

    // Inversion intelligente selon l'ordre à l'écran
    const probWinA = inverted ? stats.prob_team2 : stats.prob_team1;
    const probWinB = inverted ? stats.prob_team1 : stats.prob_team2;
    const probDraw = stats.prob_draw;

    const countWinA = Math.round((probWinA / 100) * totalMatchs);
    const countWinB = Math.round((probWinB / 100) * totalMatchs);
    const countDraw = Math.max(0, totalMatchs - countWinA - countWinB);

    // Attribution sécurisée des largeurs de barres
    document.getElementById('barWinA').style.width = `${probWinA}%`;
    document.getElementById('barWinA').textContent = probWinA > 0 ? `${probWinA}%` : '';
    
    document.getElementById('barDraw').style.width = `${probDraw}%`;
    document.getElementById('barDraw').textContent = probDraw > 0 ? `${probDraw}%` : '';
    
    document.getElementById('barWinB').style.width = `${probWinB}%`;
    document.getElementById('barWinB').textContent = probWinB > 0 ? `${probWinB}%` : '';

    document.getElementById('lblWinA').textContent = `Victoire ${tA}`;
    document.getElementById('lblWinB').textContent = `Victoire ${tB}`;

    // Lancer Chart.js
    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
}

// 4. Dessiner le Donut Chart
function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

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
                    labels: { color: '#6b7c96', font: { size: 12 } }
                }
            },
            cutout: '70%'
        }
    });
}

// Déclenchement propre au chargement complet
window.onload = loadData;
