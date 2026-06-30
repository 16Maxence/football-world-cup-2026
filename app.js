let matchData = {};
let donutChartInstance = null;

// 1. Charger les données
async function loadData() {
    try {
        // Appelle le fichier situé à la racine du projet
        const response = await fetch('./predictions_modele.json');
        if (!response.ok) {
            throw new Error(`Fichier introuvable (Code HTTP ${response.status})`);
        }
        matchData = await response.json();
        populateTeamA();
    } catch (error) {
        console.error("Erreur critique de chargement JSON :", error);
        alert("Impossible de charger le fichier 'predictions_modele.json'. Vérifie qu'il est bien présent à côté du fichier index.html.");
    }
}

// Remplir le menu déroulant de gauche (Équipe A)
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
}

// 2. Action au choix de l'équipe de gauche
function chargerAdversaires() {
    const tA = document.getElementById('teamA').value;
    const selectB = document.getElementById('teamB');
    const grid = document.getElementById('resultGrid');

    if (!grid || !selectB) return;

    grid.style.display = 'none'; // Masquer les anciens graphiques pendant la transition

    if (!tA) {
        selectB.innerHTML = '<option value="">Sélectionner Équipe</option>';
        return;
    }

    const adversaires = new Set();

    // Trouver tous les adversaires valides
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

    // Auto-sélection du premier adversaire trouvé et affichage direct
    if (sortedAdversaires.length > 0) {
        selectB.value = sortedAdversaires[0];
        afficherResultats();
    }
}

// 3. Calculs et construction visuelle
function afficherResultats() {
    const tA = document.getElementById('teamA').value;
    const tB = document.getElementById('teamB').value;
    const grid = document.getElementById('resultGrid');

    if (!grid || !tA || !tB) return;

    let matchKey = `${tA}-${tB}`;
    let inverted = false;

    // Ajustement de l'index dictionnaire
    if (!matchData[matchKey]) {
        matchKey = `${tB}-${tA}`;
        inverted = true;
    }

    const match = matchData[matchKey];
    if (!match) {
        grid.style.display = 'none';
        return;
    }

    grid.style.display = 'grid';

    const stats = match.stats;
    const totalMatchs = stats.total_history;
    document.getElementById('totalMatches').textContent = totalMatchs;

    // Gestion du sens d'inversion des données pour l'affichage
    const probWinA = inverted ? stats.prob_team2 : stats.prob_team1;
    const probWinB = inverted ? stats.prob_team1 : stats.prob_team2;
    const probDraw = stats.prob_draw;

    const countWinA = Math.round((probWinA / 100) * totalMatchs);
    const countWinB = Math.round((probWinB / 100) * totalMatchs);
    const countDraw = Math.max(0, totalMatchs - countWinA - countWinB);

    // Injection des valeurs dans la barre horizontale
    document.getElementById('barWinA').style.width = `${probWinA}%`;
    document.getElementById('barWinA').textContent = probWinA > 0 ? `${probWinA}%` : '';
    
    document.getElementById('barDraw').style.width = `${probDraw}%`;
    document.getElementById('barDraw').textContent = probDraw > 0 ? `${probDraw}%` : '';
    
    document.getElementById('barWinB').style.width = `${probWinB}%`;
    document.getElementById('barWinB').textContent = probWinB > 0 ? `${probWinB}%` : '';

    document.getElementById('lblWinA').textContent = `Victoire ${tA}`;
    document.getElementById('lblWinB').textContent = `Victoire ${tB}`;

    // Rendu graphique
    genererDonutChart(tA, tB, countWinA, countDraw, countWinB);
}

// 4. Chart.js initialisation
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

window.onload = loadData;
