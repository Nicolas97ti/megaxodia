document.addEventListener("DOMContentLoaded", function() {
    // Elementos da navegação
    const navHome = document.getElementById("nav-home");
    const navSorteador = document.getElementById("nav-sorteador");
    const homeSection = document.getElementById("home-section");
    const sorteadorSection = document.getElementById("sorteador-section");

    // Elementos do sorteador
    const inputSection = document.getElementById("input-section");
    const resultsSection = document.getElementById("results-section");
    const playersInput = document.getElementById("players-input");
    const shuffleButton = document.getElementById("shuffle-button");
    const newShuffleButton = document.getElementById("new-shuffle-button");
    const copyTeamsButton = document.getElementById("copy-teams-button"); // Botão geral
    const blueTeamGrid = document.querySelector(".blue-team");
    const redTeamGrid = document.querySelector(".red-team");
    const mapView = document.getElementById("map-view");
    const blueCopyContainer = blueTeamGrid.nextElementSibling;
    const redCopyContainer = redTeamGrid.nextElementSibling;

    // Configuração inicial
    const currentYear = document.getElementById("current-year");

    // Variáveis de estado
    let players = [];
    let teams = { blue: [], red: [] };
    let revealMode = "all";
    let teamOption = "both";
    let gradualRevealTimer = null;
    let gradualRevealCount = 0;
    let revealedOnClick = new Set();

    // Inicialização
    init();

    function init() {
        currentYear.textContent = new Date().getFullYear();

        document.querySelectorAll("input[name='revealMode']").forEach(radio => {
            radio.addEventListener("change", function() {
                revealMode = this.value;
            });
        });

        document.querySelectorAll("input[name='teamOption']").forEach(radio => {
            radio.addEventListener("change", function() {
                teamOption = this.value;
            });
        });

        navHome.addEventListener("click", showHomeSection);
        navSorteador.addEventListener("click", showSorteadorSection);
        shuffleButton.addEventListener("click", handleShuffle);
        newShuffleButton.addEventListener("click", resetShuffle);
        copyTeamsButton.addEventListener("click", () => copyTeamsToClipboard(copyTeamsButton));

        // Listeners de clique para revelação (delegação)
        blueTeamGrid.addEventListener("click", handlePlayerClick);
        redTeamGrid.addEventListener("click", handlePlayerClick);
        mapView.addEventListener("click", handlePlayerClick);
    }

    function showHomeSection() {
        navHome.classList.add("active");
        navSorteador.classList.remove("active");
        homeSection.classList.remove("hidden");
        sorteadorSection.classList.add("hidden");
        resetShuffle();
    }

    function showSorteadorSection() {
        navHome.classList.remove("active");
        navSorteador.classList.add("active");
        homeSection.classList.add("hidden");
        sorteadorSection.classList.remove("hidden");
    }

    function handleShuffle() {
        const inputText = playersInput.value.trim();
        let inputPlayers = inputText.split(/[,\n]+/).map(name => name.trim()).filter(name => name !== "");

        if (inputPlayers.length < 1) {
            alert("Por favor, insira pelo menos 1 nome para sortear!");
            return;
        }
        if (inputPlayers.length > 10) {
            alert("Por favor, insira no máximo 10 nomes para sortear!");
            return;
        }

        players = inputPlayers;
        const shuffled = shuffleArray(players);
        const positions = ["Top", "Jungle", "Mid", "ADC", "Support"];

        teams.blue = [];
        teams.red = [];

        if (teamOption === "both" || teamOption === "blue") {
            const blueTeam = shuffled.slice(0, 5);
            teams.blue = positions.map((pos, idx) => ({ name: blueTeam[idx] || "???", position: pos }));
        }
        if (teamOption === "both" || teamOption === "red") {
            const redTeam = teamOption === "both" ? shuffled.slice(5, 10) : shuffled.slice(0, 5);
            teams.red = positions.map((pos, idx) => ({ name: redTeam[idx] || "???", position: pos }));
        }

        // Resetar estados de revelação
        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null;
        }
        gradualRevealCount = 0;
        revealedOnClick.clear();

        // Exibir resultados (cria cards e botões)
        displayResults();

        // Configurar estado inicial visual baseado no modo
        updateInitialVisualState();

        // Iniciar timer se for modo gradual
        if (revealMode === "gradual") {
            const totalPlayers = (teams.blue.length + teams.red.length);
            if (totalPlayers > 0) {
                gradualRevealTimer = setInterval(function() {
                    if (gradualRevealCount < totalPlayers) {
                        gradualRevealCount++;
                        updateRevealedPlayers(); // Atualiza nomes gradualmente
                        updateMapPositions();    // Atualiza nomes gradualmente
                    } else {
                        clearInterval(gradualRevealTimer);
                        gradualRevealTimer = null;
                    }
                }, 1800);
            }
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
        inputSection.classList.add("hidden");
        resultsSection.classList.remove("hidden");

        blueTeamGrid.innerHTML = "";
        redTeamGrid.innerHTML = "";
        blueCopyContainer.innerHTML = "";
        redCopyContainer.innerHTML = "";

        const teamBlueContainer = blueTeamGrid.closest('.team-container');
        const teamRedContainer = redTeamGrid.closest('.team-container');

        if (teams.blue.length > 0) {
            teamBlueContainer.classList.remove("hidden");
            teams.blue.forEach((player, index) => {
                const playerCard = createPlayerCard("blue", player, index);
                blueTeamGrid.appendChild(playerCard);
            });
            const copyBlueButton = createCopyButton("blue");
            blueCopyContainer.appendChild(copyBlueButton);
        } else {
            teamBlueContainer.classList.add("hidden");
        }

        if (teams.red.length > 0) {
            teamRedContainer.classList.remove("hidden");
            teams.red.forEach((player, index) => {
                const playerCard = createPlayerCard("red", player, index);
                redTeamGrid.appendChild(playerCard);
            });
            const copyRedButton = createCopyButton("red");
            redCopyContainer.appendChild(copyRedButton);
        } else {
            teamRedContainer.classList.add("hidden");
        }
    }

    function createCopyButton(teamColor) {
        const button = document.createElement("button");
        button.className = "secondary-button team-copy-button";
        button.textContent = `Copiar Time ${teamColor === 'blue' ? 'Azul' : 'Vermelho'}`;
        button.addEventListener("click", () => copySingleTeamToClipboard(teamColor, button));
        return button;
    }

    function createPlayerCard(team, player, index) {
        const playerCard = document.createElement("div");
        // <<< Inicia sempre com 'hidden' (cinza) e '???' - updateInitialVisualState ajustará >>>
        playerCard.className = "player-card hidden";
        playerCard.dataset.team = team;
        playerCard.dataset.index = index;

        const positionTitle = document.createElement("div");
        positionTitle.className = "position-title";
        positionTitle.textContent = player.position;

        const playerName = document.createElement("div");
        playerName.className = "player-name";
        playerName.textContent = "???";

        playerCard.appendChild(positionTitle);
        playerCard.appendChild(playerName);
        return playerCard;
    }

    // <<< NOVO: Define o estado visual inicial após o sorteio >>>
    function updateInitialVisualState() {
        document.querySelectorAll(".player-card").forEach(card => {
            const team = card.dataset.team;
            const playerNameElement = card.querySelector(".player-name");
            playerNameElement.textContent = "???"; // Garante ??? inicial

            if (revealMode === 'click') {
                // Mostra card colorido, mas nome oculto
                card.classList.remove("hidden");
                card.classList.add(team);
                card.classList.remove(team === 'blue' ? 'red' : 'blue'); // Garante cor correta
            } else if (revealMode === 'all') {
                // Mostra card colorido e nome revelado
                card.classList.remove("hidden");
                card.classList.add(team);
                card.classList.remove(team === 'blue' ? 'red' : 'blue');
                playerNameElement.textContent = teams[team][parseInt(card.dataset.index)].name;
            } else { // gradual (ou default)
                // Começa cinza e oculto
                card.classList.add("hidden");
                card.classList.remove("blue", "red");
            }
        });

        document.querySelectorAll(".map-position").forEach(pos => {
            const team = pos.dataset.team;
            const playerNameElement = pos.querySelector(".player-name");
            playerNameElement.textContent = "???"; // Garante ??? inicial

            // Mostra/esconde times inteiros no mapa
            pos.style.display = teams[team] && teams[team].length > 0 ? "" : "none";
            if (pos.style.display === "none") return;

            if (revealMode === 'click') {
                // Mostra posição colorida, mas nome oculto
                pos.classList.remove("hidden");
                pos.classList.add(`${team}-revealed`);
                pos.classList.remove(team === 'blue' ? 'red-revealed' : 'blue-revealed'); // Garante cor correta
            } else if (revealMode === 'all') {
                // Mostra posição colorida e nome revelado
                pos.classList.remove("hidden");
                pos.classList.add(`${team}-revealed`);
                pos.classList.remove(team === 'blue' ? 'red-revealed' : 'blue-revealed');
                playerNameElement.textContent = teams[team][parseInt(pos.dataset.index)].name;
            } else { // gradual (ou default)
                // Começa cinza e oculto
                pos.classList.add("hidden");
                pos.classList.remove("blue-revealed", "red-revealed");
            }
        });
    }

    function handlePlayerClick(event) {
        if (revealMode !== "click") return;

        const target = event.target.closest(".player-card, .map-position");
        if (!target) return;

        const team = target.dataset.team;
        const index = parseInt(target.dataset.index);

        if (team && index >= 0 && !revealedOnClick.has(`${team}-${index}`)) {
             revealPlayer(team, index);
        }
    }

    // <<< Modificado: Apenas revela o NOME, cor/visibilidade já tratada >>>
    function revealPlayer(team, index) {
        revealedOnClick.add(`${team}-${index}`);

        // Atualiza nome no card
        const playerCard = document.querySelector(`.player-card[data-team="${team}"][data-index="${index}"]`);
        if (playerCard && teams[team] && teams[team][index]) {
            playerCard.querySelector(".player-name").textContent = teams[team][index].name;
        }

        // Atualiza nome na posição do mapa
        const mapPosition = document.querySelector(`.map-position[data-team="${team}"][data-index="${index}"]`);
        if (mapPosition && teams[team] && teams[team][index]) {
            mapPosition.querySelector(".player-name").textContent = teams[team][index].name;
        }
    }

    // <<< Modificado: Controla apenas a revelação gradual de NOMES >>>
    function updateRevealedPlayers() {
        // Só relevante para modo gradual agora
        if (revealMode !== 'gradual') return;

        document.querySelectorAll(".player-card").forEach(card => {
            const team = card.dataset.team;
            const index = parseInt(card.dataset.index);
            const playerNameElement = card.querySelector(".player-name");

            if (isPlayerRevealed(team, index) && teams[team] && teams[team][index]) {
                // Revela card e nome
                card.classList.remove("hidden");
                card.classList.add(team);
                playerNameElement.textContent = teams[team][index].name;
            } else {
                // Mantém oculto (se ainda não chegou a vez)
                if (!card.classList.contains(team)) { // Só mexe se não foi revelado ainda
                    card.classList.add("hidden");
                    card.classList.remove("blue", "red");
                    playerNameElement.textContent = "???";
                }
            }
        });
    }

    // <<< Modificado: Controla apenas a revelação gradual de NOMES no mapa >>>
    function updateMapPositions() {
        // Só relevante para modo gradual agora
        if (revealMode !== 'gradual') return;

        document.querySelectorAll(".map-position").forEach(pos => {
            const team = pos.dataset.team;
            const index = parseInt(pos.dataset.index);
            const playerNameElement = pos.querySelector(".player-name");

            pos.style.display = teams[team] && teams[team].length > 0 ? "" : "none";
            if (pos.style.display === "none") return;

            if (isPlayerRevealed(team, index) && teams[team] && teams[team][index]) {
                // Revela posição e nome
                pos.classList.remove("hidden");
                pos.classList.add(`${team}-revealed`);
                playerNameElement.textContent = teams[team][index].name;
            } else {
                 // Mantém oculto (se ainda não chegou a vez)
                 if (!pos.classList.contains(`${team}-revealed`)) { // Só mexe se não foi revelado ainda
                    pos.classList.add("hidden");
                    pos.classList.remove("blue-revealed", "red-revealed");
                    playerNameElement.textContent = "???";
                 }
            }
        });
    }

    // Função auxiliar para verificar se o nome deve ser revelado (usado por gradual e click)
    function isPlayerRevealed(team, index) {
        if (revealMode === "all") return true;
        if (revealMode === "click") return revealedOnClick.has(`${team}-${index}`);
        if (revealMode === "gradual") {
            let playerIndex = 0;
            if (team === "blue") {
                playerIndex = index;
            } else {
                playerIndex = (teams.blue ? teams.blue.length : 0) + index;
            }
            return playerIndex < gradualRevealCount;
        }
        return false; // Default para outros casos (nenhum atualmente)
    }

    function resetShuffle() {
        resultsSection.classList.add("hidden");
        inputSection.classList.remove("hidden");

        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null;
        }
        gradualRevealCount = 0;
        revealedOnClick.clear();

        // Reset visual completo
        document.querySelectorAll(".player-card .player-name").forEach(p => p.textContent = "???");
        document.querySelectorAll(".player-card").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue", "red"); });
        document.querySelectorAll(".map-position .player-name").forEach(p => p.textContent = "???");
        document.querySelectorAll(".map-position").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue-revealed", "red-revealed"); });

        blueCopyContainer.innerHTML = "";
        redCopyContainer.innerHTML = "";

        copyTeamsButton.textContent = "Copiar Times";
        copyTeamsButton.disabled = false;
    }

    function copyTeamsToClipboard(buttonElement) {
        let textToCopy = "";
        let teamBlueText = "";
        let teamRedText = "";

        if (teams.blue.length > 0) {
            teamBlueText += "Time Azul:\n";
            teams.blue.forEach(player => {
                teamBlueText += `- ${player.position}: ${player.name === '???' ? '(Vazio)' : player.name}\n`;
            });
            textToCopy += teamBlueText;
        }

        if (teams.red.length > 0) {
            if (textToCopy !== "") {
                textToCopy += "\n";
            }
            teamRedText += "Time Vermelho:\n";
            teams.red.forEach(player => {
                teamRedText += `- ${player.position}: ${player.name === '???' ? '(Vazio)' : player.name}\n`;
            });
            textToCopy += teamRedText;
        }

        if (textToCopy.trim() === "") {
            alert("Não há times para copiar.");
            return;
        }
        copyToClipboard(textToCopy.trim(), buttonElement);
    }

    function copySingleTeamToClipboard(teamColor, buttonElement) {
        let textToCopy = "";
        const teamData = teams[teamColor];
        const teamName = teamColor === 'blue' ? 'Azul' : 'Vermelho';

        if (teamData && teamData.length > 0) {
            textToCopy += `Time ${teamName}:\n`;
            teamData.forEach(player => {
                textToCopy += `- ${player.position}: ${player.name === '???' ? '(Vazio)' : player.name}\n`;
            });
        } else {
            alert(`Time ${teamName} está vazio.`);
            return;
        }
        copyToClipboard(textToCopy.trim(), buttonElement);
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = "Copiado!";
            buttonElement.disabled = true;
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error("Erro ao copiar: ", err);
            alert("Erro ao copiar. Verifique as permissões do navegador.");
        });
    }
});

