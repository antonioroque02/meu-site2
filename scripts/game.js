// Estado da Aplicação
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let searchQuery = '';
let editTaskId = null;

// Proxy CORS confiável com fallback
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
const CORS_PROXY_BACKUP = 'https://thingproxy.freeboard.io/fetch/';

// Seletores DOM
const taskForm = document.querySelector('#task-form');
const taskTitle = document.querySelector('#task-title');
const taskDesc = document.querySelector('#task-desc');
const taskCategory = document.querySelector('#task-category');
const taskList = document.querySelector('#task-list');
const searchInput = document.querySelector('#search-input');
const filterButtons = document.querySelectorAll('.btn-filter');
const themeToggle = document.querySelector('#theme-toggle');
const formSubmitBtn = document.querySelector('#form-submit-btn');
const cancelEditBtn = document.querySelector('#cancel-edit-btn');

// Elementos da API externa
const apiContent = document.querySelector('#api-content');
const apiLoading = document.querySelector('#api-loading');
const apiError = document.querySelector('#api-error');

// Elementos da API de Games (RAWG)
const gamesContent = document.querySelector('#games-content');
const gamesLoading = document.querySelector('#games-loading');
const gamesError = document.querySelector('#games-error');

// Elementos da API de Busca de Games
const searchGamesContent = document.querySelector('#search-games-content');
const searchGamesLoading = document.querySelector('#search-games-loading');
const searchGamesError = document.querySelector('#search-games-error');
const gameSearchInput = document.querySelector('#game-search-input');
const gameSearchBtn = document.querySelector('#game-search-btn');

// Função auxiliar para fazer requisições com fallback de proxies
async function fetchWithCorsProxy(url) {
    try {
        // Tenta com primeiro proxy (codetabs)
        const proxyUrl = CORS_PROXY + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        return await response.json();
    } catch (error) {
        console.log('Primeira proxy falhou, tentando backup...');
        try {
            // Tenta com backup proxy (thingproxy)
            const backupProxyUrl = CORS_PROXY_BACKUP + encodeURIComponent(url);
            const response = await fetch(backupProxyUrl);
            if (!response.ok) throw new Error(`Erro ${response.status}`);
            return await response.json();
        } catch (backupError) {
            console.log('Ambas as proxies falharam:', backupError);
            throw new Error('Não foi possível conectar à API de games. Tente novamente mais tarde.');
        }
    }
}

// --- 1. Consumo de API Assíncrona (Anime Aleatório - JikanAPI com CORS) ---
async function fetchGameQuote() {
    apiLoading.classList.remove('hidden');
    apiContent.classList.add('hidden');
    apiError.classList.add('hidden');

    try {
        // JikanAPI suporta CORS nativamente
        const response = await fetch('https://api.jikan.moe/v4/random/anime');
        if (!response.ok) throw new Error('Falha ao carregar anime');
        
        const data = await response.json();
        const anime = data.data || {};
        
        apiContent.innerHTML = `
            <div style="padding: 10px; background: var(--secondary-color); border-radius: 8px;">
                <h4 style="margin-bottom: 10px;">🎬 ${anime.title || 'Anime Desconhecido'}</h4>
                <p style="font-size: 0.9rem; margin: 8px 0; color: var(--text-secondary);">
                    ${anime.synopsis ? anime.synopsis.substring(0, 200) + '...' : 'Sinopse não disponível'}
                </p>
                <div style="display: flex; gap: 15px; font-size: 0.85rem; margin-top: 10px; flex-wrap: wrap;">
                    <span><strong>📅</strong> ${anime.year || 'N/A'}</span>
                    <span><strong>📺</strong> ${anime.type || 'N/A'}</span>
                    <span><strong>⭐</strong> ${anime.score ? anime.score.toFixed(1) : 'N/A'}/10</span>
                </div>
            </div>
        `;
        apiContent.classList.remove('hidden');
    } catch (error) {
        apiError.innerHTML = '⚠️ Erro ao carregar anime. <br><small>A API pode estar indisponível</small>';
        apiError.classList.remove('hidden');
    } finally {
        apiLoading.classList.add('hidden');
    }
}

// --- 1.2 Função para Buscar Games Populares (RAWG com Proxy CORS) ---
async function fetchPopularGames() {
    gamesLoading.classList.remove('hidden');
    gamesContent.innerHTML = '';
    gamesError.classList.add('hidden');

    try {
        // Usando proxy CORS com fallback para evitar bloqueio CORS
        const apiUrl = 'https://api.rawg.io/api/games?ordering=-rating&page_size=12';
        const data = await fetchWithCorsProxy(apiUrl);
        const games = data.results || [];

        if (games.length === 0) {
            gamesContent.innerHTML = '<p style="text-align:center; color:gray; grid-column: 1/-1;">Nenhum jogo encontrado.</p>';
            gamesLoading.classList.add('hidden');
            return;
        }

        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            
            const coverImage = game.background_image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="180"%3E%3Crect fill="%23444" width="300" height="180"/%3E%3C/svg%3E';
            const title = game.name || 'Desconhecido';
            const rating = game.rating ? `⭐ ${game.rating.toFixed(1)}/5` : '⭐ N/A';
            const platforms = game.platforms ? game.platforms.map(p => p.platform.name).slice(0, 2).join(', ') : 'N/A';
            const releaseDate = game.released ? new Date(game.released).toLocaleDateString('pt-BR') : 'N/A';
            const genres = game.genres ? game.genres.map(g => g.name).slice(0, 2).join(', ') : 'N/A';

            gameCard.innerHTML = `
                <div class="game-card-image">
                    <img src="${coverImage}" alt="${title}" loading="lazy">
                    <div class="game-card-overlay">
                        <button class="btn-play">▶️ DETALHES</button>
                    </div>
                </div>
                <div class="game-card-info">
                    <h4>${title}</h4>
                    <p class="game-rating">${rating}</p>
                    <p class="game-genres">🎯 ${genres}</p>
                    <p class="game-platforms">🖥️ ${platforms}</p>
                    <p class="game-date">📅 ${releaseDate}</p>
                </div>
            `;
            
            gamesContent.appendChild(gameCard);
        });

    } catch (error) {
        gamesError.innerHTML = '⚠️ <strong>Erro ao carregar jogos</strong><br><small>Tente novamente em alguns segundos ou verifique sua conexão</small>';
        gamesError.classList.remove('hidden');
        console.error('Erro ao carregar games:', error.message);
    } finally {
        gamesLoading.classList.add('hidden');
    }
}

// --- 1.3 Função para Buscar Games por Termo (RAWG com Proxy CORS) ---
async function searchGames(query) {
    if (!query.trim()) {
        searchGamesError.textContent = 'Digite o nome de um jogo para buscar.';
        searchGamesError.classList.remove('hidden');
        return;
    }

    searchGamesLoading.classList.remove('hidden');
    searchGamesContent.innerHTML = '';
    searchGamesError.classList.add('hidden');

    try {
        // Buscar games por nome usando proxy CORS com fallback
        const apiUrl = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=9`;
        const data = await fetchWithCorsProxy(apiUrl);
        const games = data.results || [];

        if (games.length === 0) {
            searchGamesContent.innerHTML = '<p style="text-align:center; color:gray; grid-column: 1/-1;">Nenhum jogo encontrado para "<strong>' + query + '</strong>"</p>';
            searchGamesLoading.classList.add('hidden');
            return;
        }

        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            
            const coverImage = game.background_image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="180"%3E%3Crect fill="%23444" width="300" height="180"/%3E%3C/svg%3E';
            const title = game.name || 'Desconhecido';
            const rating = game.rating ? `⭐ ${game.rating.toFixed(1)}/5` : '⭐ N/A';
            const genres = game.genres ? game.genres.map(g => g.name).slice(0, 3).join(', ') : 'N/A';
            const platforms = game.platforms ? game.platforms.map(p => p.platform.name).slice(0, 2).join(', ') : 'N/A';
            const releaseYear = game.released ? new Date(game.released).getFullYear() : 'N/A';

            gameCard.innerHTML = `
                <div class="game-card-image">
                    <img src="${coverImage}" alt="${title}" loading="lazy">
                    <div class="game-card-overlay">
                        <span class="badge-year">${releaseYear}</span>
                    </div>
                </div>
                <div class="game-card-info">
                    <h4>${title}</h4>
                    <p class="game-rating">${rating}</p>
                    <p class="game-genres">🎯 ${genres}</p>
                    <p class="game-platforms">🖥️ ${platforms}</p>
                </div>
            `;
            
            searchGamesContent.appendChild(gameCard);
        });

    } catch (error) {
        searchGamesError.innerHTML = '⚠️ <strong>Erro ao buscar jogos</strong><br><small>Verifique sua conexão e tente novamente</small>';
        searchGamesError.classList.remove('hidden');
        console.error('Erro ao buscar games:', error.message);
    } finally {
        searchGamesLoading.classList.add('hidden');
    }
}

// --- 2. Gerenciamento de Estado e LocalStorage ---
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateStats();
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    document.querySelector('#stat-total').textContent = total;
    document.querySelector('#stat-done').textContent = completed;
    document.querySelector('#stat-pending').textContent = pending;
}

// --- 3. Manipulação do DOM (Renderização) ---
function renderTasks() {
    taskList.innerHTML = '';

    // Aplicação de Filtros e Busca
    const filteredTasks = tasks.filter(task => {
        const matchesFilter = 
            currentFilter === 'all' || 
            (currentFilter === 'active' && !task.completed) || 
            (currentFilter === 'completed' && task.completed);
        
        const matchesSearch = 
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.desc.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align:center; color:gray;">Nenhuma missão encontrada.</p>';
        return;
    }

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div>
                <span class="badge" style="background-color: var(--primary-color); color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${task.category}</span>
                <h4 style="margin-top:5px;">${task.title}</h4>
                <p style="font-size:0.9rem; color:gray;">${task.desc}</p>
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary btn-toggle-done">${task.completed ? 'Desfazer' : 'Concluir'}</button>
                <button class="btn btn-secondary btn-edit">Editar</button>
                <button class="btn btn-secondary btn-delete" style="background-color:var(--error-color); color:white;">Excluir</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

// --- 4. Manipulação de Eventos ---

// Submit do Formulário (Adicionar ou Editar)
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = taskTitle.value.trim();
    const desc = taskDesc.value.trim();
    const category = taskCategory.value;

    if (!title) return;

    if (editTaskId) {
        // Modo Edição
        tasks = tasks.map(task => task.id === editTaskId ? { ...task, title, desc, category } : task);
        editTaskId = null;
        formSubmitBtn.textContent = 'Adicionar Missão';
        cancelEditBtn.classList.add('hidden');
    } else {
        // Modo Criação
        const newTask = {
            id: Date.now().toString(),
            title,
            desc,
            category,
            completed: false
        };
        tasks.push(newTask);
    }

    taskForm.reset();
    saveToLocalStorage();
    renderTasks();
});

// Event Delegation na lista de tarefas (Click nos botões internos)
taskList.addEventListener('click', (e) => {
    const target = e.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;
    
    const id = taskItem.dataset.id;

    if (target.classList.contains('btn-toggle-done')) {
        tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
    } else if (target.classList.contains('btn-delete')) {
        tasks = tasks.filter(task => task.id !== id);
    } else if (target.classList.contains('btn-edit')) {
        const taskToEdit = tasks.find(task => task.id === id);
        if (taskToEdit) {
            taskTitle.value = taskToEdit.title;
            taskDesc.value = taskToEdit.desc;
            taskCategory.value = taskToEdit.category;
            editTaskId = id;
            formSubmitBtn.textContent = 'Salvar Alterações';
            cancelEditBtn.classList.remove('hidden');
            taskTitle.focus();
        }
    }

    saveToLocalStorage();
    renderTasks();
});

// Cancelar Edição
cancelEditBtn.addEventListener('click', () => {
    editTaskId = null;
    taskForm.reset();
    formSubmitBtn.textContent = 'Adicionar Missão';
    cancelEditBtn.classList.add('hidden');
});

// Busca em Tempo Real (Input Event)
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
});

// Filtros de Categoria (All / Active / Completed)
document.querySelector('.filter-buttons').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-filter')) {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderTasks();
    }
});

// Alternar Modo Claro / Escuro
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Event listener para busca de games
gameSearchBtn.addEventListener('click', () => {
    const query = gameSearchInput.value;
    searchGames(query);
});

// Permitir busca ao pressionar Enter
gameSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = gameSearchInput.value;
        searchGames(query);
    }
});

// --- 5. Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', () => {
    // Carregar Tema Salvo
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);

    // Inicializar Componentes
    updateStats();
    renderTasks();
    fetchGameQuote();
    fetchPopularGames();
});