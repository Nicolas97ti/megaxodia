// ============================================================
//  MEGAXODIA - script.js (versao balanceada por rotas)
//  Com ordenacao alfabetica, sync com Google Sheets e sorteios variados
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    // ========== CONFIGURAÇÃO GOOGLE SHEETS ====================
    // URL da planilha publicada como CSV
    const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlTceJjbWHm-q8O7uBbXW-aTSjuOmMTP1XN0MlNUFCWgKYsDRO39muYuN-YBSdDSzpJlWl8lg8OXEs/pub?output=csv";
    
    // URLs de proxy CORS gratuitos (fallback se falhar)
    const CORS_PROXIES = [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://cors-anywhere.herokuapp.com/"
    ];
    
    // Verificar se está rodando localmente (file://)
    const isLocalFile = window.location.protocol === 'file:';
    
    // Armazenar último sorteio para evitar repetição
    let lastShuffleHash = null;
    
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
    const btnSyncGoogle    = document.getElementById("btn-sync-google");

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
    let registeredPlayers = [];
    let selectedForSorteio = [];
    let teams = { blue: [], red: [] };
    let revealMode = "all";
    let teamOption = "both";
    let gradualRevealTimer = null;
    let gradualRevealCount = 0;
    let revealedOnClick = new Set();
    let draggedPlayerId = null;
    let isSyncing = false;

    // ========== FUNÇÕES DE ORDENAÇÃO ==========================
    function sortPlayersAlphabetically(players) {
        return [...players].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    function sortPlayersAlphabeticallyByIds(ids) {
        const players = ids.map(id => registeredPlayers.find(p => p.id === id)).filter(Boolean);
        const sorted = sortPlayersAlphabetically(players);
        return sorted.map(p => p.id);
    }

    // ========== INIT ==========================================
    document.getElementById("current-year").textContent = new Date().getFullYear();

    navHome.addEventListener("click", () => showSection("home"));
    navJogadores.addEventListener("click", () => showSection("jogadores"));
    navSorteador.addEventListener("click", () => showSection("sorteador"));
    shuffleButton.addEventListener("click", () => handleShuffle(true));
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
    
    if (btnSyncGoogle) btnSyncGoogle.addEventListener("click", () => syncWithGoogleSheets(true));
    
    if (addAllBtn) addAllBtn.addEventListener("click", addAllToSorteio);
    if (removeAllBtn) removeAllBtn.addEventListener("click", removeAllFromSorteio);

    document.querySelectorAll("input[name='revealMode']").forEach(r =>
        r.addEventListener("change", function () { 
            revealMode = this.value;
            // Quando mudar o modo, re-renderizar para aplicar o comportamento correto
            if (teams.blue.length > 0 || teams.red.length > 0) {
                updateInitialVisualState();
            }
        }));
    document.querySelectorAll("input[name='teamOption']").forEach(r =>
        r.addEventListener("change", function () { teamOption = this.value; }));

    initStarRatings();
    
    loadInitialData();
    
    // ==========================================================
    //  FUNÇÕES DE SINCRONIZACAO COM GOOGLE SHEETS
    // ==========================================================
    
    async function fetchGoogleSheetCSV() {
        // Tentar diretamente primeiro (funciona no GitHub Pages)
        try {
            const response = await fetch(GOOGLE_SHEETS_CSV_URL);
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    return text;
                }
            }
        } catch (e) {
            console.log("Falha na requisição direta:", e.message);
        }
        
        // Tentar com proxies
        for (const proxy of CORS_PROXIES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(GOOGLE_SHEETS_CSV_URL);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const text = await response.text();
                    if (text && text.trim().length > 0) {
                        return text;
                    }
                }
            } catch (e) {
                console.log(`Proxy ${proxy} falhou:`, e.message);
            }
        }
        
        throw new Error("Não foi possível acessar a planilha do Google Sheets");
    }
    
    function parseGoogleSheetCSV(csvText) {
        const rows = [];
        const lines = csvText.split(/\r?\n/);
        
        for (const line of lines) {
            if (line.trim() === "") continue;
            
            // Limpar caracteres especiais no início da linha
            let cleanLine = line.trim();
            
            const row = [];
            let current = "";
            let inQuotes = false;
            
            for (let i = 0; i < cleanLine.length; i++) {
                const char = cleanLine[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(current.trim());
                    current = "";
                } else {
                    current += char;
                }
            }
            row.push(current.trim());
            
            // Limpar aspas das células
            const cleanRow = row.map(cell => {
                let cleaned = cell;
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                    cleaned = cleaned.slice(1, -1);
                }
                // Remover caracteres não imprimíveis
                cleaned = cleaned.replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '');
                return cleaned;
            });
            
            if (cleanRow.length > 0 && cleanRow.some(cell => cell.length > 0)) {
                rows.push(cleanRow);
            }
        }
        
        return rows;
    }
    
    async function syncWithGoogleSheets(showAlert = false) {
        if (isSyncing) {
            if (showAlert) alert("Sincronização em andamento, aguarde...");
            return;
        }
        isSyncing = true;
        
        const originalText = btnSyncGoogle ? btnSyncGoogle.textContent : null;
        if (btnSyncGoogle && showAlert) {
            btnSyncGoogle.textContent = "?? Sincronizando...";
            btnSyncGoogle.disabled = true;
        }
        
        try {
            const csvText = await fetchGoogleSheetCSV();
            const rows = parseGoogleSheetCSV(csvText);
            
            if (rows.length < 2) {
                throw new Error("Planilha vazia ou formato inválido");
            }
            
            const headers = rows[0];
            
            const nameIndex = headers.findIndex(h => 
                h.toLowerCase() === 'nome' || 
                h.toLowerCase() === 'name' ||
                h.toLowerCase() === 'jogador'
            );
            
            const topIndex = headers.findIndex(h => h.toLowerCase().includes('top'));
            const jgIndex = headers.findIndex(h => h.toLowerCase().includes('jungle') || h.toLowerCase() === 'jg');
            const midIndex = headers.findIndex(h => h.toLowerCase().includes('mid'));
            const adcIndex = headers.findIndex(h => h.toLowerCase().includes('adc'));
            const supIndex = headers.findIndex(h => h.toLowerCase().includes('support') || h.toLowerCase() === 'sup');
            
            if (nameIndex === -1) {
                throw new Error("Coluna 'Nome' não encontrada na planilha");
            }
            
            let added = 0, updated = 0;
            const newPlayers = [];
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                
                const name = row[nameIndex]?.trim();
                if (!name) continue;
                
                const getScore = (index) => {
                    if (index === -1 || index >= row.length) return 3;
                    const val = parseInt(row[index]);
                    return (isNaN(val) || val < 1 || val > 5) ? 3 : val;
                };
                
                const existingPlayer = registeredPlayers.find(p => 
                    p.name.toLowerCase() === name.toLowerCase()
                );
                
                if (existingPlayer) {
                    existingPlayer.top = getScore(topIndex);
                    existingPlayer.jg = getScore(jgIndex);
                    existingPlayer.mid = getScore(midIndex);
                    existingPlayer.adc = getScore(adcIndex);
                    existingPlayer.sup = getScore(supIndex);
                    updated++;
                    newPlayers.push(existingPlayer);
                } else {
                    newPlayers.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        name: name,
                        top: getScore(topIndex),
                        jg: getScore(jgIndex),
                        mid: getScore(midIndex),
                        adc: getScore(adcIndex),
                        sup: getScore(supIndex)
                    });
                    added++;
                }
            }
            
            if (newPlayers.length > 0) {
                registeredPlayers = sortPlayersAlphabetically(newPlayers);
                savePlayers();
                renderPlayersList();
                renderAvailablePlayers();
                renderSelectedPlayers();
                
                if (showAlert) {
                    alert(`Sincronização concluída!\n${added} jogadores adicionados, ${updated} atualizados.`);
                } else {
                    console.log(`Sincronização automática: ${added} adicionados, ${updated} atualizados`);
                }
            } else if (showAlert) {
                alert("Nenhuma alteração encontrada na planilha.");
            }
            
        } catch (error) {
            console.error("Erro na sincronização:", error);
            if (showAlert) {
                alert(`Erro ao sincronizar com Google Sheets:\n${error.message}\n\nVerifique se a planilha está publicada como CSV:\nArquivo > Compartilhar > Publicar na web > CSV`);
            }
        } finally {
            isSyncing = false;
            if (btnSyncGoogle && showAlert) {
                btnSyncGoogle.textContent = originalText;
                btnSyncGoogle.disabled = false;
            }
        }
    }
    
    // ==========================================================
    //  CARREGAMENTO INICIAL
    // ==========================================================
    async function loadInitialData() {
        const saved = localStorage.getItem("megaxodia_players");
        if (saved && saved !== "[]") {
            registeredPlayers = sortPlayersAlphabetically(JSON.parse(saved));
            renderPlayersList();
            renderAvailablePlayers();
            renderSelectedPlayers();
            showSection("home");
        } else {
            registeredPlayers = sortPlayersAlphabetically(getDefaultPlayers());
            renderPlayersList();
            renderAvailablePlayers();
            renderSelectedPlayers();
            showSection("home");
        }
        
        // Sincronização silenciosa em segundo plano
        setTimeout(() => syncWithGoogleSheets(false), 500);
    }
    
    function getDefaultPlayers() {
        return [
            { id: "1", name: "Caio", top: 2, jg: 1, mid: 1, adc: 4, sup: 4 },
            { id: "2", name: "Davi", top: 3, jg: 3, mid: 2, adc: 2, sup: 2 },
            { id: "3", name: "Eboy", top: 5, jg: 2, mid: 4, adc: 3, sup: 1 },
            { id: "4", name: "Erao", top: 1, jg: 4, mid: 3, adc: 1, sup: 4 },
            { id: "5", name: "Erick", top: 2, jg: 2, mid: 5, adc: 4, sup: 3 },
            { id: "6", name: "Giva", top: 1, jg: 3, mid: 2, adc: 3, sup: 5 },
            { id: "7", name: "Joao", top: 1, jg: 3, mid: 4, adc: 2, sup: 1 },
            { id: "8", name: "Nicolas", top: 4, jg: 1, mid: 3, adc: 3, sup: 3 }
        ];
    }
    
    function savePlayers() {
        localStorage.setItem("megaxodia_players", JSON.stringify(registeredPlayers));
    }

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
                star.innerHTML = "&#9733;";
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
        
        registeredPlayers = sortPlayersAlphabetically(registeredPlayers);
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

        let filtered = registeredPlayers.filter(p =>
            p.name.toLowerCase().includes(query));
        
        filtered = sortPlayersAlphabetically(filtered);

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

        let available = registeredPlayers.filter(p =>
            !selectedForSorteio.includes(p.id) &&
            p.name.toLowerCase().includes(query));
        
        available = sortPlayersAlphabetically(available);

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

        const sortedSelectedIds = sortPlayersAlphabeticallyByIds(selectedForSorteio);
        
        container.innerHTML = sortedSelectedIds.map(id => {
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
        let availablePlayers = registeredPlayers.filter(p => !selectedForSorteio.includes(p.id));
        availablePlayers = sortPlayersAlphabetically(availablePlayers);
        
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
    //  BALANCEAMENTO POR ROTAS COM VARIACAO
    // ==========================================================
    
    function generateShuffleHash(blueTeam, redTeam) {
        const blueStr = blueTeam.map(p => `${p.position}:${p.name}`).sort().join('|');
        const redStr = redTeam.map(p => `${p.position}:${p.name}`).sort().join('|');
        return `${blueStr}|${redStr}`;
    }
    
    function deterministicShuffle(array, seed) {
        const shuffled = [...array];
        let currentIndex = shuffled.length;
        let random;
        
        while (currentIndex !== 0) {
            random = Math.sin(seed + currentIndex) * 10000;
            const randomIndex = Math.floor(Math.abs(random) % currentIndex);
            currentIndex--;
            [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
            seed++;
        }
        return shuffled;
    }
    
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
    
    function performBalancedShuffle(playerList, avoidRepeat = true, attempt = 0) {
        const players = [...playerList];
        const result = { blue: [], red: [] };
        const usedPlayers = new Set();
        
        const seed = Date.now() + attempt * 1000 + Math.random() * 1000;
        const shuffledPlayers = deterministicShuffle(players, seed);
        
        for (const role of POSITIONS) {
            const roleKey = POSITION_MAP[role];
            const availableForRole = shuffledPlayers.filter(p => !usedPlayers.has(p.id));
            
            if (availableForRole.length === 0) break;
            
            let bestPair = null;
            let bestDiff = Infinity;
            
            for (let i = 0; i < availableForRole.length; i++) {
                for (let j = i + 1; j < availableForRole.length; j++) {
                    const p1 = availableForRole[i];
                    const p2 = availableForRole[j];
                    const score1 = p1[roleKey] || 3;
                    const score2 = p2[roleKey] || 3;
                    const diff = Math.abs(score1 - score2);
                    const randomFactor = Math.sin(seed + i * roleKey.length) * 0.01;
                    const adjustedDiff = diff + randomFactor;
                    
                    if (adjustedDiff < bestDiff) {
                        bestDiff = adjustedDiff;
                        bestPair = [p1, p2];
                    }
                }
            }
            
            if (bestPair) {
                const blueGetsStronger = (result.blue.length % 2 === 0);
                const sorted = [...bestPair].sort((a, b) => {
                    const scoreA = a[roleKey] || 3;
                    const scoreB = b[roleKey] || 3;
                    const randomFactor = Math.sin(seed + a.id.length) * 0.01;
                    return (scoreB - scoreA) + randomFactor;
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
        
        const remainingPlayers = shuffledPlayers.filter(p => !usedPlayers.has(p.id));
        
        for (const player of remainingPlayers) {
            let bestRole = null;
            let bestRoleScore = -1;
            
            for (const role of POSITIONS) {
                const roleKey = POSITION_MAP[role];
                const score = player[roleKey] || 3;
                const blueHasRole = result.blue.some(r => r.position === role);
                const redHasRole = result.red.some(r => r.position === role);
                
                if (!blueHasRole && !redHasRole) {
                    if (score > bestRoleScore) {
                        bestRoleScore = score;
                        bestRole = role;
                    }
                }
            }
            
            if (!bestRole) {
                const bestRoleData = getBestRoleForPlayer(player);
                bestRole = bestRoleData.role;
                bestRoleScore = bestRoleData.score;
            }
            
            const blueTotalScore = result.blue.reduce((sum, r) => sum + r.score, 0);
            const redTotalScore = result.red.reduce((sum, r) => sum + r.score, 0);
            const targetTeam = blueTotalScore <= redTotalScore ? "blue" : "red";
            
            if (targetTeam === "blue") {
                result.blue.push({
                    name: player.name,
                    position: bestRole,
                    score: bestRoleScore,
                    playerId: player.id
                });
            } else {
                result.red.push({
                    name: player.name,
                    position: bestRole,
                    score: bestRoleScore,
                    playerId: player.id
                });
            }
        }
        
        const finalBlue = ensureAllRoles(result.blue);
        const finalRed = ensureAllRoles(result.red);
        
        if (avoidRepeat && lastShuffleHash && attempt < 10) {
            const currentHash = generateShuffleHash(finalBlue, finalRed);
            if (currentHash === lastShuffleHash) {
                console.log("Sorteio repetido, tentando novamente... tentativa", attempt + 1);
                return performBalancedShuffle(playerList, avoidRepeat, attempt + 1);
            }
            lastShuffleHash = currentHash;
        } else if (avoidRepeat) {
            lastShuffleHash = generateShuffleHash(finalBlue, finalRed);
        }
        
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
        
        teams.blue = finalBlue.map(p => ({ name: p.name, position: p.position, score: p.score }));
        teams.red = finalRed.map(p => ({ name: p.name, position: p.position, score: p.score }));
        
        showDetailedBalanceInfo(blueScoresByRole, redScoresByRole, blueTotal, redTotal);
        finalizeShuffle();
    }
    
    function ensureAllRoles(team) {
        const result = [...team];
        const usedRoles = new Set(result.map(p => p.position));
        const missingRoles = POSITIONS.filter(role => !usedRoles.has(role));
        
        for (const missingRole of missingRoles) {
            const duplicateRole = POSITIONS.find(role => 
                result.filter(p => p.position === role).length > 1
            );
            
            if (duplicateRole) {
                const playerToMove = result.find(p => p.position === duplicateRole);
                if (playerToMove) {
                    playerToMove.position = missingRole;
                    const roleKey = POSITION_MAP[missingRole];
                    playerToMove.score = registeredPlayers.find(p => p.id === playerToMove.playerId)[roleKey] || 3;
                }
            }
        }
        
        const finalTeam = [];
        const finalUsedRoles = new Set();
        for (const player of result) {
            if (!finalUsedRoles.has(player.position)) {
                finalUsedRoles.add(player.position);
                finalTeam.push(player);
            } else {
                const availableRole = POSITIONS.find(role => !finalUsedRoles.has(role));
                if (availableRole) {
                    player.position = availableRole;
                    finalUsedRoles.add(availableRole);
                    const roleKey = POSITION_MAP[availableRole];
                    player.score = registeredPlayers.find(p => p.id === player.playerId)[roleKey] || 3;
                    finalTeam.push(player);
                }
            }
        }
        
        return finalTeam;
    }
    
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
        
        let detailsDiv = document.getElementById("role-balance-details");
        if (!detailsDiv) {
            detailsDiv = document.createElement("div");
            detailsDiv.id = "role-balance-details";
            balanceInfo.appendChild(detailsDiv);
        }
        detailsDiv.innerHTML = detailsHtml;
    }
    
    function performSimpleShuffle(playerList, avoidRepeat = true, attempt = 0) {
        const seed = Date.now() + attempt * 1000;
        let shuffled = deterministicShuffle(playerList, seed);
        
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
        
        if (avoidRepeat && lastShuffleHash && attempt < 10) {
            const currentHash = generateShuffleHash(teams.blue, teams.red);
            if (currentHash === lastShuffleHash) {
                console.log("Sorteio repetido no modo simples, tentando novamente... tentativa", attempt + 1);
                return performSimpleShuffle(playerList, avoidRepeat, attempt + 1);
            }
            lastShuffleHash = currentHash;
        } else if (avoidRepeat) {
            lastShuffleHash = generateShuffleHash(teams.blue, teams.red);
        }
        
        const blueTotal = teams.blue.reduce((sum, p) => sum + (p.score || 0), 0);
        const redTotal = teams.red.reduce((sum, p) => sum + (p.score || 0), 0);
        showBalanceInfo(blueTotal, redTotal);
        
        finalizeShuffle();
    }
    
    function handleShuffle(allowRepeat = true) {
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
            performBalancedShuffle(playerObjs, !allowRepeat);
        } else {
            performSimpleShuffle(playerObjs, !allowRepeat);
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
            } else { // click mode
                card.classList.remove("hidden");
                card.classList.add(teamColor);
                if (revealedOnClick.has(`${teamColor}-${index}`)) {
                    nameEl.textContent = teams[teamColor][index].name;
                } else {
                    nameEl.textContent = "";
                }
            }
        });
    }

    function updateMapDisplay(teamColor) {
        document.querySelectorAll(`.map-position[data-team="${teamColor}"]`).forEach(pos => {
            const index = parseInt(pos.dataset.index);
            const nameEl = pos.querySelector(".player-name");
            if (!nameEl || !teams[teamColor][index]) return;

            if (revealMode === "click") {
                // Modo clique: esconder todos os nomes inicialmente
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                if (revealedOnClick.has(`${teamColor}-${index}`)) {
                    nameEl.textContent = teams[teamColor][index].name;
                } else {
                    nameEl.textContent = "";
                }
            } else if (revealMode === "all") {
                pos.classList.remove("hidden");
                pos.classList.add(`${teamColor}-revealed`);
                nameEl.textContent = teams[teamColor][index].name;
            } else { // gradual mode
                if (isPlayerRevealed(teamColor, index)) {
                    pos.classList.remove("hidden");
                    pos.classList.add(`${teamColor}-revealed`);
                    nameEl.textContent = teams[teamColor][index].name;
                } else {
                    pos.classList.add("hidden");
                    pos.classList.remove("blue-revealed", "red-revealed");
                    nameEl.textContent = "";
                }
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
        if (team && !isNaN(index) && !revealedOnClick.has(`${team}-${index}`)) {
            revealPlayer(team, index);
        }
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
        lastShuffleHash = null;
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

                registeredPlayers = sortPlayersAlphabetically(registeredPlayers);
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