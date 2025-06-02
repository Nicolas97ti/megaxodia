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
    const copyTeamsButton = document.getElementById("copy-teams-button");
    const blueTeamGrid = document.querySelector(".blue-team");
    const redTeamGrid = document.querySelector(".red-team");
    const mapView = document.getElementById("map-view");
    const blueButtonContainer = document.getElementById("blue-team-buttons"); 
    const redButtonContainer = document.getElementById("red-team-buttons");   

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
        if (currentYear) {
             currentYear.textContent = new Date().getFullYear();
        }
       
        document.querySelectorAll("input[name=\'revealMode\']").forEach(radio => {
            radio.addEventListener("change", function() {
                revealMode = this.value;
            });
        });

        document.querySelectorAll("input[name=\'teamOption\']").forEach(radio => {
            radio.addEventListener("change", function() {
                teamOption = this.value;
            });
        });

        if (navHome) navHome.addEventListener("click", showHomeSection);
        if (navSorteador) navSorteador.addEventListener("click", showSorteadorSection);
        if (shuffleButton) shuffleButton.addEventListener("click", handleShuffle);
        if (newShuffleButton) newShuffleButton.addEventListener("click", resetShuffle);
        if (copyTeamsButton) copyTeamsButton.addEventListener("click", () => copyTeamsToClipboard(copyTeamsButton));
        if (blueTeamGrid) blueTeamGrid.addEventListener("click", handlePlayerClick);
        if (redTeamGrid) redTeamGrid.addEventListener("click", handlePlayerClick);
        if (mapView) mapView.addEventListener("click", handlePlayerClick);
        
        if (navHome && navHome.classList.contains("active")) {
            showHomeSection();
        } else if (navSorteador && navSorteador.classList.contains("active")) {
            showSorteadorSection();
        } else {
             showHomeSection();
        }
    }

    function showHomeSection() {
        if (!navHome || !navSorteador || !homeSection || !sorteadorSection) return;
        navHome.classList.add("active");
        navSorteador.classList.remove("active");
        homeSection.classList.remove("hidden");
        sorteadorSection.classList.add("hidden");
        resetShuffle();
    }

    function showSorteadorSection() {
        if (!navHome || !navSorteador || !homeSection || !sorteadorSection) return;
        navHome.classList.remove("active");
        navSorteador.classList.add("active");
        homeSection.classList.add("hidden");
        sorteadorSection.classList.remove("hidden");
    }

    function handleShuffle() {
        if (!playersInput) return;
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
        performShuffle(players);
    }

    function handleSingleTeamShuffle(teamColor) { // Renomeado de handleSingleTeamReshuffle
        if (!teams[teamColor] || teams[teamColor].length === 0) {
            alert(`Não há jogadores no Time ${teamColor === 'blue' ? 'Azul' : 'Vermelho'} para sortear.`);
            return;
        }

        const teamPlayerNames = teams[teamColor].map(player => player.name).filter(name => name !== "???");
        if (teamPlayerNames.length === 0) {
             alert(`Não é possível sortear um time com nomes não revelados ou vazios.`);
             return;
        }

        const shuffledNames = shuffleArray(teamPlayerNames);

        const positions = teams[teamColor].map(player => player.position);
        teams[teamColor] = positions.map((pos, idx) => ({
            name: shuffledNames[idx] || "???", 
            position: pos
        }));

        revealedOnClick.forEach(key => {
            if (key.startsWith(teamColor + "-")) {
                revealedOnClick.delete(key);
            }
        });

        updateTeamDisplay(teamColor);
        updateMapDisplay(teamColor);
    }

    function performShuffle(playerList) {
        const shuffled = shuffleArray(playerList);
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

        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null;
        }
        gradualRevealCount = 0;
        revealedOnClick.clear(); 

        displayResults();
        updateInitialVisualState(); 

        if (revealMode === "gradual") {
            const totalPlayers = (teams.blue.length + teams.red.length);
            if (totalPlayers > 0) {
                gradualRevealTimer = setInterval(function() {
                    if (gradualRevealCount < totalPlayers) {
                        gradualRevealCount++;
                        updateRevealedPlayers();
                        updateMapPositions();
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
        if (!inputSection || !resultsSection || !blueTeamGrid || !redTeamGrid || !blueButtonContainer || !redButtonContainer) return;
        
        inputSection.classList.add("hidden");
        resultsSection.classList.remove("hidden");

        blueTeamGrid.innerHTML = "";
        redTeamGrid.innerHTML = "";
        blueButtonContainer.innerHTML = ""; 
        redButtonContainer.innerHTML = "";  

        const teamBlueContainer = blueTeamGrid.closest(".team-container");
        const teamRedContainer = redTeamGrid.closest(".team-container");

        if (teamBlueContainer) {
            if (teams.blue.length > 0) {
                teamBlueContainer.classList.remove("hidden");
                teams.blue.forEach((player, index) => {
                    const playerCard = createPlayerCard("blue", player, index);
                    blueTeamGrid.appendChild(playerCard);
                });
                const copyBlueButton = createCopyButton("blue");
                const shuffleBlueButton = createShuffleTeamButton("blue"); // Renomeado de createReshuffleButton
                blueButtonContainer.appendChild(copyBlueButton);
                blueButtonContainer.appendChild(shuffleBlueButton);
            } else {
                teamBlueContainer.classList.add("hidden");
            }
        }

        if (teamRedContainer) {
             if (teams.red.length > 0) {
                teamRedContainer.classList.remove("hidden");
                teams.red.forEach((player, index) => {
                    const playerCard = createPlayerCard("red", player, index);
                    redTeamGrid.appendChild(playerCard);
                });
                const copyRedButton = createCopyButton("red");
                const shuffleRedButton = createShuffleTeamButton("red"); // Renomeado de createReshuffleButton
                redButtonContainer.appendChild(copyRedButton);
                redButtonContainer.appendChild(shuffleRedButton);
            } else {
                teamRedContainer.classList.add("hidden");
            }
        }
    }

    function createCopyButton(teamColor) {
        const button = document.createElement("button");
        button.className = "secondary-button team-action-button"; 
        button.textContent = `Copiar Time ${teamColor === 'blue' ? 'Azul' : 'Vermelho'}`;
        button.addEventListener("click", () => copySingleTeamToClipboard(teamColor, button));
        return button;
    }

    // <<< Função Renomeada e Texto Alterado >>>
    function createShuffleTeamButton(teamColor) { // Renomeado de createReshuffleButton
        const button = document.createElement("button");
        button.className = "secondary-button team-action-button"; 
        button.textContent = `Sortear Time ${teamColor === 'blue' ? 'Azul' : 'Vermelho'}`; // Texto alterado
        button.addEventListener("click", () => handleSingleTeamShuffle(teamColor)); // Chama a função renomeada
        return button;
    }

    function createPlayerCard(team, player, index) {
        const playerCard = document.createElement("div");
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

    function updateTeamDisplay(teamColor) {
        document.querySelectorAll(`.player-card[data-team="${teamColor}"]`).forEach(card => {
            const index = parseInt(card.dataset.index);
            const playerNameElement = card.querySelector(".player-name");
            if (!playerNameElement || !teams[teamColor] || !teams[teamColor][index]) return;

            playerNameElement.textContent = "???"; 

            if (revealMode === 'click') {
                card.classList.remove("hidden");
                card.classList.add(teamColor);
                card.classList.remove(teamColor === 'blue' ? 'red' : 'blue');
            } else if (revealMode === 'all') {
                card.classList.remove("hidden");
                card.classList.add(teamColor);
                card.classList.remove(teamColor === 'blue' ? 'red' : 'blue');
                playerNameElement.textContent = teams[teamColor][index].name;
            } else { 
                card.classList.add("hidden");
                card.classList.remove("blue", "red");
            }
        });
    }

    function updateMapDisplay(teamColor) {
        document.querySelectorAll(`.map-position[data-team="${teamColor}"]`).forEach(pos => {
            const index = parseInt(pos.dataset.index);
            const playerNameElement = pos.querySelector(".player-name");
            if (!playerNameElement || !teams[teamColor] || !teams[teamColor][index]) return;

            playerNameElement.textContent = "???"; 
            pos.style.display = teams[teamColor] && teams[teamColor].length > 0 ? "flex" : "none";
            if (pos.style.display === "none") return;

            if (revealMode === 'click') {
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                pos.classList.remove(teamColor === 'blue' ? 'red-revealed' : 'blue-revealed');
            } else if (revealMode === 'all') {
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                pos.classList.remove(teamColor === 'blue' ? 'red-revealed' : 'blue-revealed');
                playerNameElement.textContent = teams[teamColor][index].name;
            } else { 
                pos.classList.add("hidden");
                pos.classList.remove("blue-revealed", "red-revealed");
            }
        });
    }

    function updateInitialVisualState() {
        updateTeamDisplay("blue");
        updateTeamDisplay("red");
        updateMapDisplay("blue");
        updateMapDisplay("red");
    }

    function handlePlayerClick(event) {
        if (revealMode !== "click") return;
        const target = event.target.closest(".player-card, .map-position");
        if (!target) return;
        const team = target.dataset.team;
        const index = parseInt(target.dataset.index);
        if (team && typeof index === 'number' && !isNaN(index) && !revealedOnClick.has(`${team}-${index}`)) {
             revealPlayer(team, index);
        }
    }

    function revealPlayer(team, index) {
        revealedOnClick.add(`${team}-${index}`);
        const playerCard = document.querySelector(`.player-card[data-team="${team}"][data-index="${index}"]`);
        if (playerCard && teams[team] && teams[team][index]) {
            const nameElement = playerCard.querySelector(".player-name");
            if(nameElement) nameElement.textContent = teams[team][index].name;
        }
        const mapPosition = document.querySelector(`.map-position[data-team="${team}"][data-index="${index}"]`);
        if (mapPosition && teams[team] && teams[team][index]) {
             const nameElement = mapPosition.querySelector(".player-name");
             if(nameElement) nameElement.textContent = teams[team][index].name;
        }
    }

    function updateRevealedPlayers() {
        if (revealMode !== 'gradual') return;
        document.querySelectorAll(".player-card").forEach(card => {
            const team = card.dataset.team;
            const index = parseInt(card.dataset.index);
            const playerNameElement = card.querySelector(".player-name");
            if (!playerNameElement || !teams[team] || !teams[team][index]) return;

            if (isPlayerRevealed(team, index)) {
                card.classList.remove("hidden");
                card.classList.add(team);
                playerNameElement.textContent = teams[team][index].name;
            } else {
                if (!card.classList.contains(team)) {
                    card.classList.add("hidden");
                    card.classList.remove("blue", "red");
                    playerNameElement.textContent = "???";
                }
            }
        });
    }

    function updateMapPositions() {
        if (revealMode !== 'gradual') return;
        document.querySelectorAll(".map-position").forEach(pos => {
            const team = pos.dataset.team;
            const index = parseInt(pos.dataset.index);
            const playerNameElement = pos.querySelector(".player-name");
            if (!playerNameElement || !teams[team] || !teams[team][index]) return;

            pos.style.display = teams[team] && teams[team].length > 0 ? "flex" : "none";
            if (pos.style.display === "none") return;

            if (isPlayerRevealed(team, index)) {
                pos.classList.remove("hidden");
                pos.classList.add(`${team}-revealed`);
                playerNameElement.textContent = teams[team][index].name;
            } else {
                 if (!pos.classList.contains(`${team}-revealed`)) {
                    pos.classList.add("hidden");
                    pos.classList.remove("blue-revealed", "red-revealed");
                    playerNameElement.textContent = "???";
                 }
            }
        });
    }

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
        return false;
    }

    function resetShuffle() {
        if (!resultsSection || !inputSection || !blueButtonContainer || !redButtonContainer || !copyTeamsButton) return;
        
        resultsSection.classList.add("hidden");
        inputSection.classList.remove("hidden");
        if (gradualRevealTimer) {
            clearInterval(gradualRevealTimer);
            gradualRevealTimer = null;
        }
        gradualRevealCount = 0;
        revealedOnClick.clear();
        players = [];
        document.querySelectorAll(".player-card .player-name").forEach(p => p.textContent = "???");
        document.querySelectorAll(".player-card").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue", "red"); });
        document.querySelectorAll(".map-position .player-name").forEach(p => p.textContent = "???");
        document.querySelectorAll(".map-position").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue-revealed", "red-revealed"); });
        blueButtonContainer.innerHTML = ""; 
        redButtonContainer.innerHTML = "";  
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
        if (!navigator.clipboard) {
            alert("Seu navegador não suporta a cópia para a área de transferência.");
            return;
        }
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
            alert("Erro ao copiar. Verifique as permissões do navegador ou tente manualmente.");
        });
    }
});

