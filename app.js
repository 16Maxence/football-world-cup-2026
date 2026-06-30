let matchData = {};
let donutChartInstance = null;

// 1. Charger le JSON au démarrage et remplir le sélecteur de gauche (Équipe A)
async function loadData() {
    try {
        const response = await fetch('predictions_modele.json'); // Nom de votre fichier JSON
        matchData = await response.json();
        populateTeamA();
    } catch (error) {
        console.error("Erreur de chargement du JSON :", error);
    }
}

// Remplir le premier sélecteur (Gauche) avec toutes les équipes uniques disponibles
function populateTeamA() {
    const teams = new Set();
    Object.values(matchData).forEach(match => {
        if(match.team_a) teams.add(match.team_a);
        if(match.team_b) teams.add(match.team_b);
    });

    const sortedTeams = Array.from(teams).sort();
    const selectA = document.getElementById('teamA');
    
    selectA.innerHTML = '<option value="">Sélectionner Équipe</option>';
    sortedTeams.forEach(team => {
        let opt = document.createElement('option');
        opt.value = team; 
        opt.textContent = team;
        selectA.appendChild(opt);
    });

    // Initialiser le sélecteur B comme vide au départ
    document.getElementById('teamB').innerHTML = '<option value="">Sélectionner Équipe</option>';
}

// 2. ÉTAPE 1 : Appelé dès qu'on change l'Équipe Gauche (Sélectionne et filtre ses adversaires)
function chargerAdversaires() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');

    // On cache le tableau de bord tant que l'adversaire n'est pas sélectionné
    grid.style.display = 'none';

    if (!tA) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
        return;
    }

    const adversaires = new Set();

    // On cherche dans le JSON tous les pays qui ont partagé un match avec l'équipe A
    Object.values(matchData).forEach(match => {
        if (match.team_a === tA) {
            adversaires.add(match.team_b);
        } else if (match.team_b === tA) {
            adversaires.add(match.team_a);
        }
    });

    // Remplir le sélecteur de droite (Équipe B) uniquement avec les adversaires trouvés
    const sortedAdversaires = Array.from(adversaires).sort();
    selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
    
    sortedAdversaires.forEach(team => {
        let opt = document.createElement('option');
        opt.value = team; 
        opt.textContent = team;
        selectB.appendChild(opt);
    });
}

// 3. ÉTAPE 2 : Appelé dès qu'on choisit l'Équipe Droite (Affiche les résultats)
function afficherResultats() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');

    if (!tA || !tB) {
        grid.style.display = 'none';
        return;
    }

    // Déterminer si la clé est inversée dans le dictionnaire JSON
    let matchKey = `${tA}-${tB}`;
    let inverted = false;

    if (!matchData[matchKey]) {
        matchKey = `${tB}-${tA}`;
        inverted = true;
    }

    const match = matchData[matchKey];
    if (!match) return;

    // Rendre la grille visible
    grid.style.display = 'grid';

    const stats = match.stats;
    const totalMatchs = stats.total_history;
    document.getElementById('totalMatches').textContent = totalMatchs;

    // Inversion des probabilités selon le sens sélectionné à l'écran
    const probWinA = inverted ? stats.prob_team2 : stats.prob_team1;
    const probWinB = inverted ? stats.prob_team1 : stats.prob_team2;
    const probDraw = stats.prob_draw;

    // Distribution des victoires/nuls/défaites pour alimenter le graphique Donut
    const countWinA = Math.round((probWinA / 100) * totalMatchs);
    const countWinB = Math.round((probWinB / 100) * totalMatchs);
    const countDraw = Math.max(0, totalMatchs - countWinA - countWinB);

    // Mise à jour visuelle de la barre de progression horizontale
    document.getElementById('barWinA').style.width = `${probWinA}%`;
    document.getElementById('barWinA').textContent = probWinA > 0 ? `${probWinA}%` : '';
    document.getElementById('barDraw').style.width = `${probDraw}%`;
    document.getElementById('barDraw').textContent = probDraw > 0 ? `${probDraw}%` : '';
    document.getElementById('barWinB').style.width = `${probWinB}%`;
    document.getElementById('barWinB').textContent = probWinB > 0 ? `${probWinB}%` : '';

    // Labels sous la barre
    document.getElementById('lblWinA').textContent = `Victoire ${tA}`;
    document.getElementById('lblWinB').textContent = `Victoire ${tB}`;

    // Création ou rafraîchissement complet du Donut Chart.js
    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
}

// 4. Fonction de rendu du graphique Donut
function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const ctx = document.getElementById('donutChart').getContext('2d');

    // On détruit l'ancienne instance si elle existe pour éviter les conflits au survol de la souris
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

// Exécution automatique au démarrage
window.onload = loadData;
