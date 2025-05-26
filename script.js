document.addEventListener('DOMContentLoaded', function() {
    // Elementos da navegação
    const navHome = document.getElementById('nav-home');
    const navSorteador = document.getElementById('nav-sorteador');
    const homeSection = document.getElementById('home-section');
    const sorteadorSection = document.getElementById('sorteador-section');

    // Elementos do sorteador
    const inputSection = document.getElementById('input-section');
    const resultsSection = document.getElementById('results-section');
    const playersInput = document.getElementById('players-input');
    const shuffleButton = document.getElementById('shuffle-button');
    const newShuffleButton = document.getElementById('new-shuffle-button');
    const blueTeamGrid = document.querySelector('.blue-team');
    const redTeamGrid = document.querySelector('.red-team');

    // Configuração inicial
    const currentYear = document.getElementById('current-year');

    // Variáveis de estado
    let players = [];
    let teams = { blue: [], red: [] };
    let revealMode = 'all';
    let teamOption = 'both';
    let gradualRevealTimer = null; // <<< Manter como null inicialmente
    let gradualRevealCount = 0;

    // Inicialização
    init();

    function init() {
        currentYear.textContent = new Date().getFullYear();

        document.querySelectorAll('input[name="revealMode"]').forEach(radio => {
            radio.addEventListener('change', function() {
                revealMode = this.value;
            });
        });

        document.querySelectorAll('input[name="teamOption"]').forEach(radio => {
            radio.addEventListener('change', function() {
                teamOption = this.value;
            });
        });

        navHome.addEventListener('click', showHomeSection);
        navSorteador.addEventListener('click', showSorteadorSection);
        shuffleButton.addEventListener('click', handleShuffle);
        newShuffleButton.addEventListener('click', resetShuffle);
    }

    function showHomeSection() {
        navHome.classList.add('active');
        navSorteador.classList.remove('active');
        homeSection.classList.remove('hidden');
        sorteadorSection.classList.add('hidden');
        resetShuffle(); // <<< Resetar ao mudar de seção
    }

    function showSorteadorSection() {
        navHome.classList.remove('active');
        navSorteador.classList.add('active');
        homeSection.classList.add('hidden');
        sorteadorSection.classList.remove('hidden');
    }

    function handleShuffle() {
        const inputText = playersInput.value.trim();
        let inputPlayers = inputText.split(/[,\n]+/).map(name => name.trim()).filter(name => name !== '');

        if (inputPlayers.length < 1) {
            alert('Por favor, insira pelo menos 1 nome para sortear!');
            return;
        }

        if (inputPlayers.length > 10) {
            alert('Por favor, insira no máximo 10 nomes para sortear!');
            return;
        }

        players = inputPlayers;
        const shuffled = shuffleArray(players);
        const positions = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

        teams.blue = []; // <<< Limpar times antes de preencher
        teams.red = [];

        if (teamOption === 'both' || teamOption === 'blue') {
            const blueTeam = shuffled.slice(0, 5);
            teams.blue = positions.map((pos, idx) => ({
                name: blueTeam[idx] || '???', // Garante que haja um nome ou ???
                position: pos
            }));
        }

        if (teamOption === 'both' || teamOption === 'red') {
            const redTeam = teamOption === 'both' ? shuffled.slice(5, 10) : shuffled.slice(0, 5);
            teams.red = positions.map((pos, idx) => ({
                name: redTeam[idx] || '???', // Garante que haja um nome ou ???
                position: pos
            }));
        }

        // <<< Lógica de Reset e Início da Revelação - MOVIDA E MELHORADA >>>

        // 1. Limpar QUALQUER timer anterior
        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null;
        }

        // 2. Resetar contagem
        gradualRevealCount = 0;

        // 3. Exibir resultados (inicialmente escondidos se for gradual)
        displayResults();

        // 4. Forçar a atualização para o estado inicial (tudo ???) ANTES do timer
        updateRevealedPlayers();
        updateMapPositions();


        // 5. Iniciar revelação gradual se necessário
        if (revealMode === 'gradual') {
            const totalPlayers = (teams.blue.length + teams.red.length);
            if (totalPlayers > 0) { // Só inicia se houver jogadores
                gradualRevealTimer = setInterval(function() {
                    if (gradualRevealCount < totalPlayers) {
                        gradualRevealCount++;
                        updateRevealedPlayers(); // Atualiza a cada segundo
                    } else {
                        clearInterval(gradualRevealTimer); // Para o timer
                        gradualRevealTimer = null; // <<< Limpa a variável
                    }
                }, 1800); // 1.8 segundo de intervalo
            }
        } else {
             // Se for 'all', garante que tudo seja revelado imediatamente
             gradualRevealCount = 10; // Um número alto para garantir que tudo seja revelado
             updateRevealedPlayers();
             updateMapPositions();
        }
    }

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function displayResults() {
        inputSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        blueTeamGrid.innerHTML = '';
        redTeamGrid.innerHTML = '';

        const teamBlueContainer = document.querySelector('.team-container:first-child');
        const teamRedContainer = document.querySelector('.team-container:last-of-type');

        if (teams.blue.length > 0) {
            teamBlueContainer.classList.remove('hidden');
            teams.blue.forEach((player, index) => {
                const playerCard = createPlayerCard('blue', player, index);
                blueTeamGrid.appendChild(playerCard);
            });
        } else {
            teamBlueContainer.classList.add('hidden');
        }

        if (teams.red.length > 0) {
            teamRedContainer.classList.remove('hidden');
            teams.red.forEach((player, index) => {
                const playerCard = createPlayerCard('red', player, index);
                redTeamGrid.appendChild(playerCard);
            });
        } else {
            teamRedContainer.classList.add('hidden');
        }

        // Não chamamos updateMapPositions aqui, deixamos updateRevealedPlayers cuidar disso
    }

    function createPlayerCard(team, player, index) {
        const playerCard = document.createElement('div');
        // <<< Inicia sempre como 'hidden' e sem cor, updateRevealedPlayers controla isso >>>
        playerCard.className = 'player-card hidden';
        playerCard.dataset.team = team;
        playerCard.dataset.index = index;

        const positionTitle = document.createElement('div');
        positionTitle.className = 'position-title';
        positionTitle.textContent = player.position;

        const playerName = document.createElement('div');
        playerName.className = 'player-name';
        playerName.textContent = '???'; // <<< Inicia sempre como ???

        playerCard.appendChild(positionTitle);
        playerCard.appendChild(playerName);
        return playerCard;
    }


    function isPlayerRevealed(team, index) {
        if (revealMode === 'all') return true;

        if (revealMode === 'gradual') {
            let playerIndex = 0;
            if (team === 'blue') {
                playerIndex = index;
            } else {
                playerIndex = (teams.blue ? teams.blue.length : 0) + index;
            }
            return playerIndex < gradualRevealCount;
        }
        return false; // Não usamos 'click'
    }

    function updateRevealedPlayers() {
        document.querySelectorAll('.player-card').forEach(card => {
            const team = card.dataset.team;
            const index = parseInt(card.dataset.index);
            const playerNameElement = card.querySelector('.player-name');

            if (isPlayerRevealed(team, index) && teams[team] && teams[team][index]) {
                card.classList.remove('hidden');
                card.classList.add(team);
                playerNameElement.textContent = teams[team][index].name;
            } else {
                card.classList.add('hidden');
                card.classList.remove('blue', 'red'); // Remove ambas as cores
                playerNameElement.textContent = '???';
            }
        });
        updateMapPositions(); // <<< Atualiza o mapa junto com os cards
    }


    function updateMapPositions() {
        document.querySelectorAll('.map-position').forEach(pos => {
            const team = pos.dataset.team;
            const index = parseInt(pos.dataset.index);
            const playerNameElement = pos.querySelector('.player-name');

            if (teams[team] && teams[team][index] && isPlayerRevealed(team, index)) {
                pos.classList.add(`${team}-revealed`);
                pos.classList.remove('hidden');
                playerNameElement.textContent = teams[team][index].name;
            } else {
                pos.classList.remove('blue-revealed', 'red-revealed');
                pos.classList.add('hidden');
                playerNameElement.textContent = '???';
            }
        });

        // Esconde ou mostra os times no mapa dependendo se eles existem
         document.querySelectorAll('.map-position[data-team="blue"]').forEach(p => {
             p.style.display = teams.blue.length > 0 ? '' : 'none';
         });
         document.querySelectorAll('.map-position[data-team="red"]').forEach(p => {
             p.style.display = teams.red.length > 0 ? '' : 'none';
         });
    }

    function resetShuffle() {
        resultsSection.classList.add('hidden');
        inputSection.classList.remove('hidden');

        // Limpar timer de revelação gradual
        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null; // <<< Sempre setar para null
        }
        gradualRevealCount = 0; // <<< Resetar contador aqui também por segurança

        // Opcional: Limpar o textarea
        // playersInput.value = '';

        // Resetar visualização do mapa (opcional, mas bom)
        document.querySelectorAll('.map-position .player-name').forEach(p => p.textContent = '???');
        document.querySelectorAll('.map-position').forEach(p => p.classList.add('hidden'));

    }
});