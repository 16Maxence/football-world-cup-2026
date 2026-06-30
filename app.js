let matchData = {};
let donutChartInstance = null;

// 1. Charger les données du fichier JSON au démarrage
async function loadData() {
    try {
        const response = await fetch('data.json');
        matchData = await response.json();
        populateTeamA(); // On ne remplit d'abord que le premier sélecteur
    } catch (error) {
        console.error("Erreur de chargement du JSON :", error);
    }
}

// 2. Remplir le premier sélecteur (Gauche) avec toutes les équipes disponibles
function populateTeamA() {
    const teams = new Set();
    Object.values(matchData).forEach(match => {
        if(match.team_a) teams.add(match.team_a);
        if(match.team_b) teams.add(match.team_b);
    });

    const sortedTeams = Array.from(teams).sort();
    const selectA = document.getElementById('teamA');
    
    // Vider et réinitialiser
    selectA.innerHTML = '<option value="">Sélectionner Équipe</option>';

    sortedTeams.forEach(team => {
        let optA = document.createElement('option');
        optA.value = team; 
        optA.textContent = team;
        selectA.appendChild(optA);
    });

    // Par sécurité, on vide le sélecteur B au début
    document.getElementById('teamB').innerHTML = '<option value="">Sélectionner Équipe</option>';
}

// 3. Filtrer et remplir le deuxième sélecteur (Droite) selon le choix fait à gauche
function filtrerTeamB() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');

    // Si aucune équipe n'est sélectionnée à gauche, on vide la droite et on cache le tableau
    if (!tA) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
        grid.style.display = 'none';
        return;
    }

    const adversaires = new Set();

    // Parcourir le JSON pour trouver tous les adversaires ayant rencontré l'équipe A
    Object.values(matchData).forEach(match => {
        if (match.team_a === tA) {
            adversaires.add(match.team_b);
        } else if (match.team_b === tA) {
            adversaires.add(match.team_a);
        }
    });

    const sortedAdversaires = Array.from(adversaires).sort();
    
    // Remplir le sélecteur de droite avec uniquement les adversaires valides
    selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
    sortedAdversaires.forEach(team => {
        let optB = document.createElement('option');
        optB.value = team; 
        optB.textContent = team;
        selectB.appendChild(optB);
    });

    // Cacher la grille de résultats en attendant que l'utilisateur choisisse l'adversaire
    grid.style.display = 'none';
}

// 4. Fonction globale déclenchée au changement des sélecteurs
function mettreAJourMatch() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');

    // Étape de transition : si l'utilisateur change l'équipe de gauche, on recalcule la liste de droite
    // (on vérifie l'événement via les éléments actifs pour ne pas boucler)
    if (document.activeElement && document.activeElement.id === 'teamA') {
        filtrerTeamB();
        return;
    }

    // Si les deux sélections ne sont pas prêtes, on s'arrête là
    if (!tA || !tB) {
        grid.style.display = 'none';
        return;
    }

    // Trouver la clé dans un sens ou dans l'autre au sein du JSON
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

    // Simulation des données de l'historique pour le Donut
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

// 5. Gestionnaire de graphique Chart.js
function genererDonutChart(teamA, teamB, winA, draw, winB) {
    const ctx = document.getElementById('donutChart').getContext('2d');

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
            cutout: '70%'
        }
    });
}

// Lancement automatique du script
window.onload = loadData;
