// ============================================================
//  MEGAXODIA - script.js (versao balanceada por rotas)
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    // ========== NAVEGACAO ====================================
    const navHome       = document.getElementById("nav-home");
    const navJogadores  = document.getElementById("nav-jogadores");
    const navSorteador  = document.getElementById("nav-sorteador");
    const homeSection       = document.getElementById("home-section");
    const jogadoresSection  = document.getElementById("jogadores-section");
    const sorteadorSection  = document.getElementById("sorteador-section");

    // ========== SORTEADOR ====================================
    const inputSection   = document.getElementById("input-section");
    const resultsSection = document.getElementById("results-section");
    const shuffleButton  = document.getElementById("shuffle-button");
    const newShuffleButton   = document.getElementById("new-shuffle-button");
    const copyTeamsButton    = document.getElementById("copy-teams-button");
    const blueTeamGrid   = document.querySelector(".blue-team");
    const redTeamGrid    = document.querySelector(".red-team");
    const mapView        = document.getElementById("map-view");
    const blueButtonContainer = document.getElementById("blue-team-buttons");
    const redButtonContainer  = document.getElementById("red-team-buttons");
    const balanceToggle  = document.getElementById("balance-toggle");
    const balanceInfo    = document.getElementById("balance-info");
    const addAllBtn      = document.getElementById("add-all-btn");
    const removeAllBtn   = document.getElementById("remove-all-btn");

    // ========== JOGADORES FORM ================================
    const btnNovoJogador   = document.getElementById("btn-novo-jogador");
    const btnSavePlayer    = document.getElementById("btn-save-player");
    const btnCancelForm    = document.getElementById("btn-cancel-form");
    const playerFormContainer = document.getElementById("player-form-container");
    const formTitle        = document.getElementById("form-title");
    const formPlayerName   = document.getElementById("form-player-name");
    const editPlayerId     = document.getElementById("edit-player-id");
    const playerSearch     = document.getElementById("player-search");
    const sorteadorSearch  = document.getElementById("sorteador-search");
    const excelImport      = document.getElementById("excel-import");
    const btnExportExcel   = document.getElementById("btn-export-excel");

    const POSITIONS = ["Top", "Jungle", "Mid", "ADC", "Support"];
    const ROLES = ["top", "jg", "mid", "adc", "sup"];
    const POSITION_MAP = {
        "Top": "top",
        "Jungle": "jg",
        "Mid": "mid",
        "ADC": "adc",
        "Support": "sup"
    };

    // ========== STATE ========================================
    let registeredPlayers = loadPlayers();
    let selectedForSorteio = [];
    let teams = { blue: [], red: [] };
    let revealMode = "all";
    let teamOption = "both";
    let gradualRevealTimer = null;
    let gradualRevealCount = 0;
    let revealedOnClick = new Set();
    let draggedPlayerId = null;

    // ========== INIT ==========================================
    document.getElementById("current-year").textContent = new Date().getFullYear();

    navHome.addEventListener("click", () => showSection("home"));
    navJogadores.addEventListener("click", () => showSection("jogadores"));
    navSorteador.addEventListener("click", () => showSection("sorteador"));
    shuffleButton.addEventListener("click", handleShuffle);
    newShuffleButton.addEventListener("click", resetShuffle);
    copyTeamsButton.addEventListener("click", () => copyTeamsToClipboard(copyTeamsButton));
    blueTeamGrid.addEventListener("click", handlePlayerClick);
    redTeamGrid.addEventListener("click", handlePlayerClick);
    mapView.addEventListener("click", handlePlayerClick);
    btnNovoJogador.addEventListener("click", openNewPlayerForm);
    btnSavePlayer.addEventListener("click", savePlayer);
    btnCancelForm.addEventListener("click", closeForm);
    playerSearch.addEventListener("input", renderPlayersList);
    sorteadorSearch.addEventListener("input", renderAvailablePlayers);
    excelImport.addEventListener("change", handleExcelImport);
    btnExportExcel.addEventListener("click", handleExcelExport);
    
    if (addAllBtn) addAllBtn.addEventListener("click", addAllToSorteio);
    if (removeAllBtn) removeAllBtn.addEventListener("click", removeAllFromSorteio);

    document.querySelectorAll("input[name='revealMode']").forEach(r =>
        r.addEventListener("change", function () { revealMode = this.value; }));
    document.querySelectorAll("input[name='teamOption']").forEach(r =>
        r.addEventListener("change", function () { teamOption = this.value; }));

    initStarRatings();
    renderPlayersList();
    renderAvailablePlayers();
    showSection("home");

    // ==========================================================
    //  NAVIGATION
    // ==========================================================
    function showSection(name) {
        homeSection.classList.add("hidden");
        jogadoresSection.classList.add("hidden");
        sorteadorSection.classList.add("hidden");
        navHome.classList.remove("active");
        navJogadores.classList.remove("active");
        navSorteador.classList.remove("active");

        if (name === "home") {
            homeSection.classList.remove("hidden");
            navHome.classList.add("active");
        } else if (name === "jogadores") {
            jogadoresSection.classList.remove("hidden");
            navJogadores.classList.add("active");
            renderPlayersList();
        } else if (name === "sorteador") {
            sorteadorSection.classList.remove("hidden");
            navSorteador.classList.add("active");
            renderAvailablePlayers();
            renderSelectedPlayers();
        }
    }

    // ==========================================================
    //  STAR RATING WIDGET
    // ==========================================================
    function initStarRatings() {
        document.querySelectorAll(".star-rating").forEach(container => {
            container.innerHTML = "";
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement("span");
                star.className = "star";
                star.setAttribute("data-star", i);
                star.innerHTML = "&#9733;"; // Código HTML para estrela (?)
                star.dataset.value = i;
                star.addEventListener("click", () => {
                    const role = container.dataset.role;
                    const hiddenInput = document.getElementById("score-" + role);
                    hiddenInput.value = i;
                    updateStars(container, i);
                });
                star.addEventListener("mouseover", () => updateStars(container, i, true));
                star.addEventListener("mouseleave", () => {
                    const role = container.dataset.role;
                    const val = parseInt(document.getElementById("score-" + role).value) || 3;
                    updateStars(container, val);
                });
                container.appendChild(star);
            }
            updateStars(container, 3);
        });
    }

    function updateStars(container, value, hover = false) {
        const stars = container.querySelectorAll(".star");
        stars.forEach((star, idx) => {
            const starValue = idx + 1;
            if (starValue <= value) {
                star.classList.add("active");
                star.style.color = "#D4AF37";
                star.style.textShadow = "0 0 2px rgba(212, 175, 55, 0.5)";
            } else {
                star.classList.remove("active");
                star.style.color = "#555";
                star.style.textShadow = "none";
            }
            if (hover && starValue <= value) {
                star.classList.add("hover");
                star.style.color = "#f1c232";
            } else {
                star.classList.remove("hover");
                if (starValue <= value) {
                    star.style.color = "#D4AF37";
                }
            }
        });
    }

    function setStarRatingValue(role, value) {
        const container = document.querySelector(`.star-rating[data-role="${role}"]`);
        const hiddenInput = document.getElementById("score-" + role);
        hiddenInput.value = value;
        if (container) updateStars(container, value);
    }

    // ==========================================================
    //  PLAYER CRUD
    // ==========================================================
    function loadPlayers() {
        try {
            const saved = localStorage.getItem("megaxodia_players");
            if (saved && saved !== "[]") {
                return JSON.parse(saved);
            }
            return [
                { id: "1", name: "Nicolas", top: 4, jg: 1, mid: 3, adc: 3, sup: 3 },
                { id: "2", name: "Joao", top: 1, jg: 3, mid: 4, adc: 2, sup: 1 },
                { id: "3", name: "Erick", top: 2, jg: 2, mid: 5, adc: 4, sup: 3 },
                { id: "4", name: "Davi", top: 3, jg: 3, mid: 2, adc: 2, sup: 2 },
                { id: "5", name: "Erao", top: 1, jg: 4, mid: 3, adc: 1, sup: 4 },
                { id: "6", name: "Caio", top: 2, jg: 1, mid: 1, adc: 4, sup: 4 },
                { id: "7", name: "Eboy", top: 5, jg: 2, mid: 4, adc: 3, sup: 1 },
                { id: "8", name: "Giva", top: 1, jg: 3, mid: 2, adc: 3, sup: 5 }
            ];
        } catch {
            return [];
        }
    }

    function savePlayers() {
        localStorage.setItem("megaxodia_players", JSON.stringify(registeredPlayers));
    }

    function openNewPlayerForm() {
        editPlayerId.value = "";
        formTitle.textContent = "Novo Jogador";
        formPlayerName.value = "";
        ROLES.forEach(r => setStarRatingValue(r, 3));
        playerFormContainer.classList.remove("hidden");
        formPlayerName.focus();
    }

    function openEditPlayerForm(id) {
        const p = registeredPlayers.find(x => x.id === id);
        if (!p) return;
        editPlayerId.value = id;
        formTitle.textContent = "Editar Jogador";
        formPlayerName.value = p.name;
        ROLES.forEach(r => setStarRatingValue(r, p[r] || 3));
        playerFormContainer.classList.remove("hidden");
        formPlayerName.focus();
        playerFormContainer.scrollIntoView({ behavior: "smooth" });
    }

    function closeForm() {
        playerFormContainer.classList.add("hidden");
    }

    function savePlayer() {
        const name = formPlayerName.value.trim();
        if (!name) { alert("Por favor insira o nome do jogador."); return; }

        const scores = {};
        ROLES.forEach(r => { scores[r] = parseInt(document.getElementById("score-" + r).value) || 3; });

        const id = editPlayerId.value;
        if (id) {
            const idx = registeredPlayers.findIndex(x => x.id === id);
            if (idx >= 0) { registeredPlayers[idx] = { id, name, ...scores }; }
        } else {
            registeredPlayers.push({ id: Date.now().toString(), name, ...scores });
        }

        savePlayers();
        closeForm();
        renderPlayersList();
        renderAvailablePlayers();
    }

    function deletePlayer(id) {
        if (!confirm("Remover este jogador?")) return;
        registeredPlayers = registeredPlayers.filter(x => x.id !== id);
        selectedForSorteio = selectedForSorteio.filter(x => x !== id);
        savePlayers();
        renderPlayersList();
        renderAvailablePlayers();
        renderSelectedPlayers();
    }

    // ==========================================================
    //  RENDER PLAYERS LIST
    // ==========================================================
    function renderPlayersList() {
        const grid = document.getElementById("players-grid");
        const noMsg = document.getElementById("no-players-msg");
        const query = (playerSearch.value || "").toLowerCase().trim();

        const filtered = registeredPlayers.filter(p =>
            p.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            grid.innerHTML = "";
            noMsg.classList.remove("hidden");
            return;
        }
        noMsg.classList.add("hidden");

        grid.innerHTML = filtered.map(p => `
            <div class="player-card-reg" draggable="true"
                 data-id="${p.id}"
                 ondragstart="window._dragStart(event, '${p.id}')">
                <div class="pcr-header">
                    <span class="pcr-name">${escapeHtml(p.name)}</span>
                    <div class="pcr-actions">
                        <button class="btn-icon btn-edit" onclick="window._editPlayer('${p.id}')" title="Editar">Editar</button>
                        <button class="btn-icon btn-del" onclick="window._deletePlayer('${p.id}')" title="Remover">Remover</button>
                    </div>
                </div>
                <div class="pcr-scores">
                    ${POSITIONS.map((pos, i) => `
                        <div class="pcr-score-item">
                            <span class="pcr-pos">${pos}:</span>
                            <div class="pcr-stars">${renderMiniStars(p[ROLES[i]])}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("");
    }

    function renderMiniStars(val) {
        let s = "";
        for (let i = 1; i <= 5; i++) {
            const activeClass = i <= val ? 'active' : '';
            const starColor = i <= val ? '#D4AF37' : '#555';
            s += `<span class="mini-star ${activeClass}" style="color: ${starColor};">&#9733;</span>`;
        }
        return s;
    }

    // ==========================================================
    //  SORTEADOR - Available & Selected players
    // ==========================================================
    function renderAvailablePlayers() {
        const container = document.getElementById("available-players-list");
        const query = (sorteadorSearch ? sorteadorSearch.value : "").toLowerCase().trim();

        const available = registeredPlayers.filter(p =>
            !selectedForSorteio.includes(p.id) &&
            p.name.toLowerCase().includes(query));

        if (available.length === 0) {
            container.innerHTML = `<p class="no-players-msg" style="display:block">
                ${registeredPlayers.length === 0
                    ? 'Cadastre jogadores na aba "Jogadores" primeiro.'
                    : 'Todos os jogadores ja estao no sorteio.'}</p>`;
            return;
        }

        container.innerHTML = available.map(p => `
            <div class="avail-player-item" draggable="true"
                data-id="${p.id}"
                ondragstart="window._dragStart(event, '${p.id}')"
                ondblclick="window._addToSorteio('${p.id}')">
                <span class="avail-name">${escapeHtml(p.name)}</span>
                <div class="avail-scores-mini">
                    <span class="role-badge" title="Top">Top: ${p.top}</span>
                    <span class="role-badge" title="Jungle">Jg: ${p.jg}</span>
                    <span class="role-badge" title="Mid">Mid: ${p.mid}</span>
                    <span class="role-badge" title="ADC">ADC: ${p.adc}</span>
                    <span class="role-badge" title="Support">Sup: ${p.sup}</span>
                </div>
                <button class="btn-add-player" onclick="window._addToSorteio('${p.id}')" title="Adicionar ao sorteio">+</button>
            </div>
        `).join("");
    }

    function renderSelectedPlayers() {
        const container = document.getElementById("selected-players-list");
        const hint = document.getElementById("drag-hint");
        const countEl = document.getElementById("selected-count");
        countEl.textContent = `${selectedForSorteio.length}/10`;

        if (selectedForSorteio.length === 0) {
            container.innerHTML = "";
            if (hint) { hint.style.display = "block"; container.appendChild(hint); }
            return;
        }
        if (hint) hint.style.display = "none";

        container.innerHTML = selectedForSorteio.map(id => {
            const p = registeredPlayers.find(x => x.id === id);
            if (!p) return "";
            return `
                <div class="selected-player-item" draggable="true"
                     data-id="${p.id}"
                     ondragstart="window._dragStart(event, '${p.id}')">
                    <span class="sel-name">${escapeHtml(p.name)}</span>
                    <button class="btn-remove-sel" onclick="window._removeFromSorteio('${p.id}')" title="Remover">X</button>
                </div>
            `;
        }).join("");
    }

    window._dragStart = function (event, id) {
        draggedPlayerId = id;
        event.dataTransfer.setData("text/plain", id);
    };

    window.handleDropOnSelected = function (event) {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain") || draggedPlayerId;
        if (id) addToSorteio(id);
    };

    function addToSorteio(id) {
        if (selectedForSorteio.includes(id)) return;
        if (selectedForSorteio.length >= 10) { alert("Maximo de 10 jogadores no sorteio!"); return; }
        selectedForSorteio.push(id);
        renderAvailablePlayers();
        renderSelectedPlayers();
    }

    function removeFromSorteio(id) {
        selectedForSorteio = selectedForSorteio.filter(x => x !== id);
        renderAvailablePlayers();
        renderSelectedPlayers();
    }

    function addAllToSorteio() {
        const availablePlayers = registeredPlayers.filter(p => !selectedForSorteio.includes(p.id));
        if (availablePlayers.length === 0) return;
        const currentCount = selectedForSorteio.length;
        const availableSlots = 10 - currentCount;
        if (availableSlots <= 0) return;
        const toAdd = availablePlayers.slice(0, availableSlots);
        toAdd.forEach(p => {
            if (!selectedForSorteio.includes(p.id)) {
                selectedForSorteio.push(p.id);
            }
        });
        renderAvailablePlayers();
        renderSelectedPlayers();
    }

    function removeAllFromSorteio() {
        if (selectedForSorteio.length === 0) return;
        selectedForSorteio = [];
        renderAvailablePlayers();
        renderSelectedPlayers();
    }

    window._addToSorteio = (id) => addToSorteio(id);
    window._removeFromSorteio = (id) => removeFromSorteio(id);
    window._editPlayer = (id) => openEditPlayerForm(id);
    window._deletePlayer = (id) => deletePlayer(id);

    // ==========================================================
    //  NOVO ALGORITMO DE BALANCEAMENTO POR ROTAS
    // ==========================================================
    
    /**
     * Retorna a melhor rota para um jogador baseado em suas pontuacoes
     */
    function getBestRoleForPlayer(player) {
        let bestRole = null;
        let bestScore = -1;
        
        for (const pos of POSITIONS) {
            const roleKey = POSITION_MAP[pos];
            const score = player[roleKey] || 3;
            if (score > bestScore) {
                bestScore = score;
                bestRole = pos;
            }
        }
        return { role: bestRole, score: bestScore };
    }
    
    /**
     * Ordena jogadores por sua melhor rota e pontuacao
     */
    function sortPlayersByBestRole(players) {
        return players.map(p => ({
            player: p,
            bestRole: getBestRoleForPlayer(p)
        })).sort((a, b) => {
            // Primeiro ordena por rota (para agrupar)
            if (a.bestRole.role !== b.bestRole.role) {
                return a.bestRole.role.localeCompare(b.bestRole.role);
            }
            // Depois por pontuacao (decrescente)
            return b.bestRole.score - a.bestRole.score;
        });
    }
    
    /**
     * Calcula a diferenca de forca entre dois jogadores em uma rota especifica
     */
    function getRoleDifference(player1, player2, role) {
        const roleKey = POSITION_MAP[role];
        const score1 = player1[roleKey] || 3;
        const score2 = player2[roleKey] || 3;
        return Math.abs(score1 - score2);
    }
    
    /**
     * Encontra o melhor oponente para um jogador em uma rota especifica
     */
    function findBestMatch(players, role, targetScore) {
        let bestMatch = null;
        let bestDiff = Infinity;
        
        for (const p of players) {
            const roleKey = POSITION_MAP[role];
            const score = p[roleKey] || 3;
            const diff = Math.abs(score - targetScore);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestMatch = p;
            }
        }
        return bestMatch;
    }
    
    /**
     * Balanceamento inteligente por rotas
     * Cada rota e balanceada individualmente
     */
    function performBalancedShuffle(playerList) {
        const players = [...playerList];
        
        // Para cada rota, encontrar os 2 melhores jogadores para aquela rota
        // (um para cada time, baseado na pontuação)
        const roleMatches = {};
        
        for (const role of POSITIONS) {
            const roleKey = POSITION_MAP[role];
            
            // Ordena jogadores por pontuação nesta rota (melhores primeiro)
            const rankedByRole = [...players].sort((a, b) => {
                const scoreA = a[roleKey] || 3;
                const scoreB = b[roleKey] || 3;
                return scoreB - scoreA;
            });
            
            roleMatches[role] = {
                strong: rankedByRole[0],  // Melhor para esta rota
                weak: rankedByRole[rankedByRole.length - 1]  // Pior para esta rota
            };
        }
        
        // Estratégia: distribuir os jogadores de forma que cada time tenha
        // uma mistura de fortes e fracos em cada rota
        
        const result = { blue: [], red: [] };
        const usedPlayers = new Set();
        
        // Primeiro, garantir que cada rota seja preenchida com jogadores
        // que têm afinidade com ela, mantendo o balanceamento
        
        // Para cada rota, vamos atribuir um jogador ao time azul e outro ao vermelho
        // Priorizando que a diferença de pontuação em cada rota seja mínima
        for (const role of POSITIONS) {
            const roleKey = POSITION_MAP[role];
            
            // Filtrar jogadores disponíveis que têm boa pontuação nesta rota
            const availableForRole = players.filter(p => !usedPlayers.has(p.id));
            
            if (availableForRole.length === 0) break;
            
            // Encontrar o melhor par de jogadores para esta rota (um para cada time)
            // que minimize a diferença de pontuação
            let bestPair = null;
            let bestDiff = Infinity;
            
            for (let i = 0; i < availableForRole.length; i++) {
                for (let j = i + 1; j < availableForRole.length; j++) {
                    const p1 = availableForRole[i];
                    const p2 = availableForRole[j];
                    const score1 = p1[roleKey] || 3;
                    const score2 = p2[roleKey] || 3;
                    const diff = Math.abs(score1 - score2);
                    
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestPair = [p1, p2];
                    }
                }
            }
            
            if (bestPair) {
                // Alternar qual time recebe o melhor jogador para balancear
                const blueGetsStronger = (result.blue.length % 2 === 0);
                
                // Ordenar por pontuação
                const sorted = [...bestPair].sort((a, b) => {
                    const scoreA = a[roleKey] || 3;
                    const scoreB = b[roleKey] || 3;
                    return scoreB - scoreA;
                });
                
                const stronger = sorted[0];
                const weaker = sorted[1];
                
                if (blueGetsStronger) {
                    result.blue.push({
                        name: stronger.name,
                        position: role,
                        score: stronger[roleKey] || 3,
                        playerId: stronger.id
                    });
                    result.red.push({
                        name: weaker.name,
                        position: role,
                        score: weaker[roleKey] || 3,
                        playerId: weaker.id
                    });
                } else {
                    result.blue.push({
                        name: weaker.name,
                        position: role,
                        score: weaker[roleKey] || 3,
                        playerId: weaker.id
                    });
                    result.red.push({
                        name: stronger.name,
                        position: role,
                        score: stronger[roleKey] || 3,
                        playerId: stronger.id
                    });
                }
                
                usedPlayers.add(stronger.id);
                usedPlayers.add(weaker.id);
            }
        }
        
        // Verificar se todas as rotas foram preenchidas
        // Se não, preencher com os jogadores restantes
        const missingRolesBlue = POSITIONS.filter(role => !result.blue.some(p => p.position === role));
        const missingRolesRed = POSITIONS.filter(role => !result.red.some(p => p.position === role));
        
        // Jogadores restantes (não deveria acontecer com 10 jogadores)
        const remainingPlayers = players.filter(p => !usedPlayers.has(p.id));
        
        // Preencher rotas faltantes com jogadores restantes
        for (let i = 0; i < missingRolesBlue.length && i < remainingPlayers.length; i++) {
            const player = remainingPlayers[i];
            const role = missingRolesBlue[i];
            const roleKey = POSITION_MAP[role];
            result.blue.push({
                name: player.name,
                position: role,
                score: player[roleKey] || 3,
                playerId: player.id
            });
            usedPlayers.add(player.id);
        }
        
        for (let i = 0; i < missingRolesRed.length; i++) {
            // Encontrar jogador não usado para esta rota
            const availableForRole = players.filter(p => !usedPlayers.has(p.id));
            if (availableForRole.length > 0) {
                const player = availableForRole[0];
                const role = missingRolesRed[i];
                const roleKey = POSITION_MAP[role];
                result.red.push({
                    name: player.name,
                    position: role,
                    score: player[roleKey] || 3,
                    playerId: player.id
                });
                usedPlayers.add(player.id);
            }
        }
        
        // Garantir que cada time tenha exatamente 5 jogadores
        // Se faltar jogador, buscar dos disponíveis
        while (result.blue.length < 5) {
            const available = players.filter(p => !usedPlayers.has(p.id));
            if (available.length === 0) break;
            const player = available[0];
            const roleKey = POSITION_MAP["Top"];
            result.blue.push({
                name: player.name,
                position: "Top",
                score: player[roleKey] || 3,
                playerId: player.id
            });
            usedPlayers.add(player.id);
        }
        
        while (result.red.length < 5) {
            const available = players.filter(p => !usedPlayers.has(p.id));
            if (available.length === 0) break;
            const player = available[0];
            const roleKey = POSITION_MAP["Top"];
            result.red.push({
                name: player.name,
                position: "Top",
                score: player[roleKey] || 3,
                playerId: player.id
            });
            usedPlayers.add(player.id);
        }
        
        // Após garantir que todos os times têm 5 jogadores,
        // vamos ajustar as posições para garantir que cada time tenha todas as 5 rotas
        
        // Verificar rotas faltantes no time azul
        const blueRoles = new Set(result.blue.map(p => p.position));
        const missingBlueRoles = POSITIONS.filter(role => !blueRoles.has(role));
        
        // Se faltam rotas, trocar jogadores de posição
        for (const missingRole of missingBlueRoles) {
            // Encontrar um jogador que está em uma posição duplicada
            const duplicateRole = POSITIONS.find(role => 
                result.blue.filter(p => p.position === role).length > 1
            );
            
            if (duplicateRole) {
                const playerToMove = result.blue.find(p => p.position === duplicateRole);
                if (playerToMove) {
                    playerToMove.position = missingRole;
                    // Atualizar pontuação para a nova posição
                    const roleKey = POSITION_MAP[missingRole];
                    playerToMove.score = registeredPlayers.find(p => p.id === playerToMove.playerId)[roleKey] || 3;
                }
            }
        }
        
        // Verificar rotas faltantes no time vermelho
        const redRoles = new Set(result.red.map(p => p.position));
        const missingRedRoles = POSITIONS.filter(role => !redRoles.has(role));
        
        for (const missingRole of missingRedRoles) {
            const duplicateRole = POSITIONS.find(role => 
                result.red.filter(p => p.position === role).length > 1
            );
            
            if (duplicateRole) {
                const playerToMove = result.red.find(p => p.position === duplicateRole);
                if (playerToMove) {
                    playerToMove.position = missingRole;
                    const roleKey = POSITION_MAP[missingRole];
                    playerToMove.score = registeredPlayers.find(p => p.id === playerToMove.playerId)[roleKey] || 3;
                }
            }
        }
        
        // Garantir que não há posições duplicadas - Time Azul
        const finalBlue = [];
        const usedBlueRoles = new Set();
        for (const player of result.blue) {
            if (!usedBlueRoles.has(player.position)) {
                usedBlueRoles.add(player.position);
                finalBlue.push(player);
            } else {
                // Encontrar uma posição não usada para este jogador
                const availableRole = POSITIONS.find(role => !usedBlueRoles.has(role));
                if (availableRole) {
                    player.position = availableRole;
                    usedBlueRoles.add(availableRole);
                    const roleKey = POSITION_MAP[availableRole];
                    player.score = registeredPlayers.find(p => p.id === player.playerId)[roleKey] || 3;
                    finalBlue.push(player);
                }
            }
        }
        
        // Garantir que não há posições duplicadas - Time Vermelho
        const finalRed = [];
        const usedRedRoles = new Set();
        for (const player of result.red) {
            if (!usedRedRoles.has(player.position)) {
                usedRedRoles.add(player.position);
                finalRed.push(player);
            } else {
                const availableRole = POSITIONS.find(role => !usedRedRoles.has(role));
                if (availableRole) {
                    player.position = availableRole;
                    usedRedRoles.add(availableRole);
                    const roleKey = POSITION_MAP[availableRole];
                    player.score = registeredPlayers.find(p => p.id === player.playerId)[roleKey] || 3;
                    finalRed.push(player);
                }
            }
        }
        
        // Calcular scores totais por rota para mostrar balanceamento
        const blueScoresByRole = {};
        const redScoresByRole = {};
        let blueTotal = 0;
        let redTotal = 0;
        
        for (const role of POSITIONS) {
            const bluePlayer = finalBlue.find(r => r.position === role);
            const redPlayer = finalRed.find(r => r.position === role);
            
            blueScoresByRole[role] = bluePlayer ? bluePlayer.score : 0;
            redScoresByRole[role] = redPlayer ? redPlayer.score : 0;
            blueTotal += blueScoresByRole[role];
            redTotal += redScoresByRole[role];
        }
        
        // Formatar teams para o formato esperado
        teams.blue = finalBlue.map(p => ({ name: p.name, position: p.position, score: p.score }));
        teams.red = finalRed.map(p => ({ name: p.name, position: p.position, score: p.score }));
        
        // Mostrar informacao de balanceamento detalhada
        showDetailedBalanceInfo(blueScoresByRole, redScoresByRole, blueTotal, redTotal);
        
        finalizeShuffle();
    }
    
    /**
     * Mostra informacao detalhada de balanceamento por rota
     */
    function showDetailedBalanceInfo(blueScores, redScores, blueTotal, redTotal) {
        if (!balanceInfo) return;
        balanceInfo.classList.remove("hidden");
        
        const max = Math.max(blueTotal, redTotal) || 1;
        const blueFill = document.getElementById("blue-balance-fill");
        const redFill = document.getElementById("red-balance-fill");
        if (blueFill) blueFill.style.width = (blueTotal / max * 100) + "%";
        if (redFill) redFill.style.width = (redTotal / max * 100) + "%";
        
        const blueLabel = document.getElementById("blue-score-label");
        const redLabel = document.getElementById("red-score-label");
        if (blueLabel) blueLabel.textContent = blueTotal + " pts";
        if (redLabel) redLabel.textContent = redTotal + " pts";
        
        // Adicionar detalhes por rota
        let detailsHtml = '<div style="margin-top: 15px; font-size: 0.8rem;"><strong>Confrontos por Rota:</strong><br>';
        for (const role of POSITIONS) {
            const blueScore = blueScores[role] || 0;
            const redScore = redScores[role] || 0;
            const diff = Math.abs(blueScore - redScore);
            const diffClass = diff <= 1 ? 'good' : (diff <= 2 ? 'warning' : 'bad');
            detailsHtml += `<span style="display: inline-block; margin-right: 15px;">
                ${role}: ${blueScore} vs ${redScore} 
                <span style="color: ${diffClass === 'good' ? '#4CAF50' : (diffClass === 'warning' ? '#FFC107' : '#F44336')}">
                    (dif: ${diff})
                </span>
            </span><br>`;
        }
        detailsHtml += '</div>';
        
        // Verificar se ja existe o elemento de detalhes
        let detailsDiv = document.getElementById("role-balance-details");
        if (!detailsDiv) {
            detailsDiv = document.createElement("div");
            detailsDiv.id = "role-balance-details";
            balanceInfo.appendChild(detailsDiv);
        }
        detailsDiv.innerHTML = detailsHtml;
    }
    
    /**
     * Sorteio simples (sem balanceamento) - para menos de 10 jogadores
     */
    function performSimpleShuffle(playerList) {
        const shuffled = shuffleArray(playerList);
        teams.blue = [];
        teams.red = [];

        if (teamOption === "both" || teamOption === "blue") {
            teams.blue = POSITIONS.map((pos, i) => ({
                name: shuffled[i] ? shuffled[i].name : "",
                position: pos,
                score: shuffled[i] ? (shuffled[i][POSITION_MAP[pos]] || 3) : 0
            }));
        }
        if (teamOption === "both" || teamOption === "red") {
            const redPlayers = teamOption === "both" ? shuffled.slice(5) : shuffled;
            teams.red = POSITIONS.map((pos, i) => ({
                name: redPlayers[i] ? redPlayers[i].name : "",
                position: pos,
                score: redPlayers[i] ? (redPlayers[i][POSITION_MAP[pos]] || 3) : 0
            }));
        }
        
        // Calcular totais para mostrar
        const blueTotal = teams.blue.reduce((sum, p) => sum + (p.score || 0), 0);
        const redTotal = teams.red.reduce((sum, p) => sum + (p.score || 0), 0);
        showBalanceInfo(blueTotal, redTotal);
        
        finalizeShuffle();
    }
    
    function handleShuffle() {
        const playerObjs = selectedForSorteio
            .map(id => registeredPlayers.find(p => p.id === id))
            .filter(Boolean);

        if (playerObjs.length < 1) {
            alert("Adicione pelo menos 1 jogador ao sorteio!");
            return;
        }
        if (playerObjs.length > 10) {
            alert("Maximo 10 jogadores!");
            return;
        }

        const useBalance = balanceToggle && balanceToggle.checked;
        if (useBalance && playerObjs.length === 10) {
            performBalancedShuffle(playerObjs);
        } else {
            performSimpleShuffle(playerObjs);
        }
    }

    function showBalanceInfo(blueScore, redScore) {
        if (!balanceInfo) return;
        balanceInfo.classList.remove("hidden");
        const max = Math.max(blueScore, redScore) || 1;
        const blueFill = document.getElementById("blue-balance-fill");
        const redFill = document.getElementById("red-balance-fill");
        if (blueFill) blueFill.style.width = (blueScore / max * 100) + "%";
        if (redFill) redFill.style.width = (redScore / max * 100) + "%";
        const blueLabel = document.getElementById("blue-score-label");
        const redLabel = document.getElementById("red-score-label");
        if (blueLabel) blueLabel.textContent = blueScore + " pts";
        if (redLabel) redLabel.textContent = redScore + " pts";
        
        // Remover detalhes antigos se existirem
        const detailsDiv = document.getElementById("role-balance-details");
        if (detailsDiv) detailsDiv.remove();
    }

    function finalizeShuffle() {
        if (gradualRevealTimer) { clearInterval(gradualRevealTimer); gradualRevealTimer = null; }
        gradualRevealCount = 0;
        revealedOnClick.clear();
        displayResults();
        updateInitialVisualState();

        if (revealMode === "gradual") {
            const total = teams.blue.length + teams.red.length;
            if (total > 0) {
                gradualRevealTimer = setInterval(() => {
                    if (gradualRevealCount < total) {
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

    // ==========================================================
    //  DISPLAY RESULTS
    // ==========================================================
    function displayResults() {
        inputSection.classList.add("hidden");
        resultsSection.classList.remove("hidden");
        blueTeamGrid.innerHTML = "";
        redTeamGrid.innerHTML = "";
        blueButtonContainer.innerHTML = "";
        redButtonContainer.innerHTML = "";

        const hasBlue = teamOption === "both" || teamOption === "blue";
        const hasRed = teamOption === "both" || teamOption === "red";

        const teamContainers = document.querySelectorAll(".team-container");
        if (teamContainers[0]) teamContainers[0].style.display = hasBlue ? "" : "none";
        if (teamContainers[1]) teamContainers[1].style.display = hasRed ? "" : "none";

        if (hasBlue) {
            teams.blue.forEach((player, idx) => {
                const card = document.createElement("div");
                card.className = "player-card hidden";
                card.dataset.team = "blue";
                card.dataset.index = idx;
                card.innerHTML = `<div class="position-title">${player.position}</div><div class="player-name"></div>`;
                blueTeamGrid.appendChild(card);
            });
            appendTeamButtons("blue", blueButtonContainer);
        }

        if (hasRed) {
            teams.red.forEach((player, idx) => {
                const card = document.createElement("div");
                card.className = "player-card hidden";
                card.dataset.team = "red";
                card.dataset.index = idx;
                card.innerHTML = `<div class="position-title">${player.position}</div><div class="player-name"></div>`;
                redTeamGrid.appendChild(card);
            });
            appendTeamButtons("red", redButtonContainer);
        }

        updateMapVisibility();
    }

    function appendTeamButtons(color, container) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "secondary-button";
        copyBtn.textContent = `Copiar Time ${color === "blue" ? "Azul" : "Vermelho"}`;
        copyBtn.addEventListener("click", () => copySingleTeamToClipboard(color, copyBtn));

        const reshuffleBtn = document.createElement("button");
        reshuffleBtn.className = "secondary-button";
        reshuffleBtn.textContent = `Ressortear Time ${color === "blue" ? "Azul" : "Vermelho"}`;
        reshuffleBtn.addEventListener("click", () => handleSingleTeamShuffle(color));

        container.appendChild(copyBtn);
        container.appendChild(reshuffleBtn);
    }

    function updateMapVisibility() {
        const hasBlue = teamOption === "both" || teamOption === "blue";
        const hasRed = teamOption === "both" || teamOption === "red";
        document.querySelectorAll(".map-position[data-team='blue']").forEach(p =>
            p.style.display = hasBlue && teams.blue.length > 0 ? "flex" : "none");
        document.querySelectorAll(".map-position[data-team='red']").forEach(p =>
            p.style.display = hasRed && teams.red.length > 0 ? "flex" : "none");
    }

    function handleSingleTeamShuffle(teamColor) {
        const names = teams[teamColor].map(p => p.name).filter(n => n !== "");
        if (names.length === 0) { alert("Sem jogadores para ressortear."); return; }
        const shuffled = shuffleArray(names);
        const positions = teams[teamColor].map(p => p.position);
        teams[teamColor] = positions.map((pos, i) => ({ name: shuffled[i] || "", position: pos }));
        revealedOnClick.forEach(key => { if (key.startsWith(teamColor + "-")) revealedOnClick.delete(key); });
        updateTeamDisplay(teamColor);
        updateMapDisplay(teamColor);
    }

    function updateTeamDisplay(teamColor) {
        document.querySelectorAll(`.player-card[data-team="${teamColor}"]`).forEach(card => {
            const index = parseInt(card.dataset.index);
            const nameEl = card.querySelector(".player-name");
            if (!nameEl || !teams[teamColor][index]) return;

            if (revealMode === "all") {
                card.classList.remove("hidden");
                card.classList.add(teamColor);
                nameEl.textContent = teams[teamColor][index].name;
            } else if (revealMode === "gradual") {
                if (isPlayerRevealed(teamColor, index)) {
                    card.classList.remove("hidden");
                    card.classList.add(teamColor);
                    nameEl.textContent = teams[teamColor][index].name;
                } else {
                    card.classList.add("hidden");
                    card.classList.remove("blue", "red");
                    nameEl.textContent = "";
                }
            } else {
                card.classList.remove("hidden");
                card.classList.add(teamColor);
                if (revealedOnClick.has(`${teamColor}-${index}`))
                    nameEl.textContent = teams[teamColor][index].name;
                else nameEl.textContent = "";
            }
        });
    }

    function updateMapDisplay(teamColor) {
        document.querySelectorAll(`.map-position[data-team="${teamColor}"]`).forEach(pos => {
            const index = parseInt(pos.dataset.index);
            const nameEl = pos.querySelector(".player-name");
            if (!nameEl || !teams[teamColor][index]) return;

            if (revealMode === "click") {
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                nameEl.textContent = teams[teamColor][index].name;
            } else if (revealMode === "all") {
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                nameEl.textContent = teams[teamColor][index].name;
            } else {
                pos.classList.add("hidden");
                pos.classList.remove("blue-revealed", "red-revealed");
                nameEl.textContent = "";
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
        if (team && !isNaN(index) && !revealedOnClick.has(`${team}-${index}`))
            revealPlayer(team, index);
    }

    function revealPlayer(team, index) {
        revealedOnClick.add(`${team}-${index}`);
        const card = document.querySelector(`.player-card[data-team="${team}"][data-index="${index}"]`);
        if (card) card.querySelector(".player-name").textContent = teams[team][index].name;
        const mapPos = document.querySelector(`.map-position[data-team="${team}"][data-index="${index}"]`);
        if (mapPos) mapPos.querySelector(".player-name").textContent = teams[team][index].name;
    }

    function updateRevealedPlayers() {
        if (revealMode !== "gradual") return;
        document.querySelectorAll(".player-card").forEach(card => {
            const team = card.dataset.team;
            const index = parseInt(card.dataset.index);
            const nameEl = card.querySelector(".player-name");
            if (!nameEl || !teams[team] || !teams[team][index]) return;
            if (isPlayerRevealed(team, index)) {
                card.classList.remove("hidden");
                card.classList.add(team);
                nameEl.textContent = teams[team][index].name;
            } else {
                if (!card.classList.contains(team)) {
                    card.classList.add("hidden");
                    card.classList.remove("blue", "red");
                    nameEl.textContent = "";
                }
            }
        });
    }

    function updateMapPositions() {
        if (revealMode !== "gradual") return;
        document.querySelectorAll(".map-position").forEach(pos => {
            const team = pos.dataset.team;
            const index = parseInt(pos.dataset.index);
            const nameEl = pos.querySelector(".player-name");
            if (!nameEl || !teams[team] || !teams[team][index]) return;
            pos.style.display = teams[team] && teams[team].length > 0 ? "flex" : "none";
            if (isPlayerRevealed(team, index)) {
                pos.classList.remove("hidden");
                pos.classList.add(`${team}-revealed`);
                nameEl.textContent = teams[team][index].name;
            } else {
                if (!pos.classList.contains(`${team}-revealed`)) {
                    pos.classList.add("hidden");
                    pos.classList.remove("blue-revealed", "red-revealed");
                    nameEl.textContent = "";
                }
            }
        });
    }

    function isPlayerRevealed(team, index) {
        if (revealMode === "all") return true;
        if (revealMode === "click") return revealedOnClick.has(`${team}-${index}`);
        if (revealMode === "gradual") {
            const playerIndex = team === "blue" ? index : (teams.blue ? teams.blue.length : 0) + index;
            return playerIndex < gradualRevealCount;
        }
        return false;
    }

    function resetShuffle() {
        resultsSection.classList.add("hidden");
        inputSection.classList.remove("hidden");
        if (gradualRevealTimer) { clearInterval(gradualRevealTimer); gradualRevealTimer = null; }
        gradualRevealCount = 0;
        revealedOnClick.clear();
        if (balanceInfo) balanceInfo.classList.add("hidden");
        document.querySelectorAll(".player-card .player-name").forEach(p => p.textContent = "");
        document.querySelectorAll(".player-card").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue", "red"); });
        document.querySelectorAll(".map-position .player-name").forEach(p => p.textContent = "");
        document.querySelectorAll(".map-position").forEach(p => { p.classList.add("hidden"); p.classList.remove("blue-revealed", "red-revealed"); });
        if (blueButtonContainer) blueButtonContainer.innerHTML = "";
        if (redButtonContainer) redButtonContainer.innerHTML = "";
        if (copyTeamsButton) {
            copyTeamsButton.textContent = "Copiar Times";
            copyTeamsButton.disabled = false;
        }
    }

    // ==========================================================
    //  CLIPBOARD
    // ==========================================================
    function copyTeamsToClipboard(btn) {
        let text = "";
        if (teams.blue && teams.blue.length > 0) {
            text += "Time Azul:\n";
            teams.blue.forEach(p => { text += `- ${p.position}: ${p.name || "(Vazio)"}\n`; });
        }
        if (teams.red && teams.red.length > 0) {
            if (text) text += "\n";
            text += "Time Vermelho:\n";
            teams.red.forEach(p => { text += `- ${p.position}: ${p.name || "(Vazio)"}\n`; });
        }
        if (!text.trim()) { alert("Nao ha times para copiar."); return; }
        copyToClipboard(text.trim(), btn);
    }

    function copySingleTeamToClipboard(color, btn) {
        const data = teams[color];
        if (!data || data.length === 0) { alert("Time vazio."); return; }
        const name = color === "blue" ? "Azul" : "Vermelho";
        let text = `Time ${name}:\n`;
        data.forEach(p => { text += `- ${p.position}: ${p.name || "(Vazio)"}\n`; });
        copyToClipboard(text.trim(), btn);
    }

    function copyToClipboard(text, btn) {
        if (!navigator.clipboard) { alert("Navegador nao suporta copia."); return; }
        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.textContent;
            btn.textContent = "Copiado!";
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = orig;
                btn.disabled = false;
            }, 2000);
        }).catch(() => alert("Erro ao copiar."));
    }

    // ==========================================================
    //  EXCEL IMPORT/EXPORT
    // ==========================================================
    function handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

                let added = 0, updated = 0, skipped = 0;

                rows.forEach(row => {
                    const name = (row["Nome"] || row["name"] || "").toString().trim();
                    if (!name) { skipped++; return; }

                    const getScore = (...keys) => {
                        for (const k of keys) {
                            let v = row[k];
                            if (typeof v === 'string') v = v.trim();
                            v = parseInt(v);
                            if (!isNaN(v) && v >= 1 && v <= 5) return v;
                        }
                        return 3;
                    };

                    const existingIndex = registeredPlayers.findIndex(p =>
                        p.name.toLowerCase() === name.toLowerCase()
                    );

                    const playerData = {
                        top: getScore("Top (1-5)", "Top", "top"),
                        jg: getScore("Jungle (1-5)", "Jungle", "jg", "Jg"),
                        mid: getScore("Mid (1-5)", "Mid", "mid"),
                        adc: getScore("ADC (1-5)", "ADC", "adc", "Adc"),
                        sup: getScore("Support (1-5)", "Support", "sup", "Sup"),
                    };

                    if (existingIndex >= 0) {
                        const existingPlayer = registeredPlayers[existingIndex];
                        registeredPlayers[existingIndex] = {
                            id: existingPlayer.id,
                            name: name,
                            ...playerData
                        };
                        updated++;
                    } else {
                        registeredPlayers.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            name: name,
                            ...playerData
                        });
                        added++;
                    }
                });

                savePlayers();
                renderPlayersList();
                renderAvailablePlayers();
                renderSelectedPlayers();
                alert(`Importacao concluida!\n${added} jogadores adicionados, ${updated} atualizados, ${skipped} ignorados.`);
            } catch (err) {
                alert("Erro ao importar Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = "";
    }

    function handleExcelExport() {
        if (registeredPlayers.length === 0) { alert("Nenhum jogador para exportar."); return; }

        const rows = registeredPlayers.map(p => ({
            "Nome": p.name,
            "Top (1-5)": p.top,
            "Jungle (1-5)": p.jg,
            "Mid (1-5)": p.mid,
            "ADC (1-5)": p.adc,
            "Support (1-5)": p.sup,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jogadores");
        XLSX.writeFile(wb, "megaxodia_jogadores.xlsx");
    }

    // ==========================================================
    //  UTILITIES
    // ==========================================================
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
});