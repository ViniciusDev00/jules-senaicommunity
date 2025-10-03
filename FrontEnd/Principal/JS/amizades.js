document.addEventListener("DOMContentLoaded", () => {
    // --- CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ---
    const backendUrl = "http://localhost:8080";
    const jwtToken = localStorage.getItem("token");
    let stompClient = null;
    let currentUser = null;
    let userFriends = [];
    let friendsLoaded = false;
    let latestOnlineEmails = [];
    const defaultAvatarUrl = `${backendUrl}/images/default-avatar.png`;

    // --- ELEMENTOS DO DOM (Seleção Centralizada e Completa) ---
    const elements = {
        // UI Geral
        userDropdownTrigger: document.querySelector(".user-dropdown .user"),
        logoutBtn: document.getElementById("logout-btn"),
        notificationCenter: document.querySelector(".notification-center"),
        topbarUserName: document.getElementById("topbar-user-name"),
        sidebarUserName: document.getElementById("sidebar-user-name"),
        sidebarUserTitle: document.getElementById("sidebar-user-title"),
        topbarUserImg: document.getElementById("topbar-user-img"),
        sidebarUserImg: document.getElementById("sidebar-user-img"),
        connectionsCount: document.getElementById('connections-count'),

        // Notificações e Amigos Online
        notificationsIcon: document.getElementById('notifications-icon'),
        notificationsPanel: document.getElementById('notifications-panel'),
        notificationsList: document.getElementById('notifications-list'),
        notificationsBadge: document.getElementById('notifications-badge'),
        onlineFriendsList: document.getElementById('online-friends-list'),

        // Elementos Específicos da Página de Amizades
        receivedRequestsList: document.getElementById('received-requests-list'),
        sentRequestsList: document.getElementById('sent-requests-list'),
        friendsList: document.getElementById('friends-list'),

        // Modais de Conta de Usuário
        editProfileBtn: document.getElementById("edit-profile-btn"),
        deleteAccountBtn: document.getElementById("delete-account-btn"),
        editProfileModal: document.getElementById("edit-profile-modal"),
        editProfileForm: document.getElementById("edit-profile-form"),
        cancelEditProfileBtn: document.getElementById("cancel-edit-profile-btn"),
        editProfilePicInput: document.getElementById("edit-profile-pic-input"),
        editProfilePicPreview: document.getElementById("edit-profile-pic-preview"),
        editProfileName: document.getElementById("edit-profile-name"),
        editProfileBio: document.getElementById("edit-profile-bio"),
        editProfileDob: document.getElementById("edit-profile-dob"),
        editProfilePassword: document.getElementById("edit-profile-password"),
        editProfilePasswordConfirm: document.getElementById("edit-profile-password-confirm"),
        deleteAccountModal: document.getElementById("delete-account-modal"),
        deleteAccountForm: document.getElementById("delete-account-form"),
        cancelDeleteAccountBtn: document.getElementById("cancel-delete-account-btn"),
        deleteConfirmPassword: document.getElementById("delete-confirm-password"),
    };

    // --- INICIALIZAÇÃO ---
    async function init() {
        if (!jwtToken) {
            window.location.href = "login.html";
            return;
        }
        axios.defaults.headers.common["Authorization"] = `Bearer ${jwtToken}`;

        try {
            const response = await axios.get(`${backendUrl}/usuarios/me`);
            currentUser = response.data;
            updateUIWithUserData(currentUser);
            setupEventListeners();
            connectWebSocket();
            fetchFriends();
            fetchReceivedRequests();
            fetchSentRequests();
            fetchNotifications();

        } catch (error) {
            console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
            localStorage.removeItem("token");
            window.location.href = "login.html";
        }
    }

    // --- FUNÇÕES DE UI ---
    function updateUIWithUserData(user) {
        if (!user) return;
        const userImage = user.urlFotoPerfil ? `${backendUrl}${user.urlFotoPerfil}` : defaultAvatarUrl;
        if (elements.topbarUserName) elements.topbarUserName.textContent = user.nome;
        if (elements.sidebarUserName) elements.sidebarUserName.textContent = user.nome;
        if (elements.sidebarUserTitle) elements.sidebarUserTitle.textContent = user.titulo || "Membro da Comunidade";
        if (elements.topbarUserImg) elements.topbarUserImg.src = userImage;
        if (elements.sidebarUserImg) elements.sidebarUserImg.src = userImage;
    }

    function showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        if (elements.notificationCenter) elements.notificationCenter.appendChild(notification);
        setTimeout(() => { notification.classList.add("show"); }, 10);
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => { notification.remove(); }, 300);
        }, 5000);
    }

    // --- LÓGICA DO WEBSOCKET ---
    function connectWebSocket() {
        const socket = new SockJS(`${backendUrl}/ws`);
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        const headers = { Authorization: `Bearer ${jwtToken}` };
        stompClient.connect(headers, (frame) => {
            console.log("CONECTADO AO WEBSOCKET");
            stompClient.subscribe(`/user/${currentUser.email}/queue/notifications`, (message) => {
    const newNotification = JSON.parse(message.body);
    showNotification(`Nova notificação: ${newNotification.mensagem}`, 'info');
    if (elements.notificationsList) {
        const emptyState = elements.notificationsList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        const newItem = createNotificationElement(newNotification);
        elements.notificationsList.prepend(newItem);
    }

    if (elements.notificationsBadge) {
        const currentCount = parseInt(elements.notificationsBadge.textContent) || 0;
        const newCount = currentCount + 1;
        elements.notificationsBadge.textContent = newCount;
        elements.notificationsBadge.style.display = 'flex';
    }
});
            stompClient.subscribe("/topic/status", (message) => {
                latestOnlineEmails = JSON.parse(message.body);
                atualizarStatusDeAmigosNaUI();

            });
        }, (error) => console.error("ERRO WEBSOCKET:", error));
    }

    // --- FUNÇÕES DE NOTIFICAÇÕES ---
    async function fetchNotifications() {
        try {
            const response = await axios.get(`${backendUrl}/api/notificacoes`);
            renderNotifications(response.data);
        } catch (error) {
            console.error("Erro ao buscar notificações:", error);
        }
    }

    function renderNotifications(notifications) {
        if (!elements.notificationsList) return;
        elements.notificationsList.innerHTML = '';
        const unreadCount = notifications.filter(n => !n.lida).length;

        if (elements.notificationsBadge) {
            elements.notificationsBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
            elements.notificationsBadge.textContent = unreadCount;
        }

        if (notifications.length === 0) {
            elements.notificationsList.innerHTML = '<p class="empty-state">Nenhuma notificação.</p>';
            return;
        }

        notifications.forEach(notification => {
            const item = createNotificationElement(notification);
            item.className = 'notification-item';
            item.id = `notification-item-${notification.id}`;
            if (!notification.lida) item.classList.add('unread');

            const data = new Date(notification.dataCriacao).toLocaleString('pt-BR');
            let actionButtonsHtml = '';
            let iconClass = 'fa-info-circle';

            if (notification.tipo === 'PEDIDO_AMIZADE' && !notification.lida) {
                iconClass = 'fa-user-plus';
                // Os botões de aceitar/recusar precisam ser definidos globalmente ou importados se for usar aqui
                actionButtonsHtml = `
              <div class="notification-actions">
                 <button class="btn btn-sm btn-primary" onclick="window.aceitarSolicitacao(${notification.idReferencia}, ${notification.id})">Aceitar</button>
                 <button class="btn btn-sm btn-secondary" onclick="window.recusarSolicitacao(${notification.idReferencia}, ${notification.id})">Recusar</button>
              </div>
            `;
            }

            item.innerHTML = `
            <a href="amizades.html" class="notification-link" onclick="markNotificationAsRead(${notification.id})">
                <div class="notification-icon-wrapper"><i class="fas ${iconClass}"></i></div>
                <div class="notification-content">
                    <p>${notification.mensagem}</p>
                    <span class="timestamp">${data}</span>
                </div>
            </a>
            <div class="notification-actions-wrapper">${actionButtonsHtml}</div>
        `;

            const actionsWrapper = item.querySelector('.notification-actions-wrapper');
            if (actionsWrapper) {
                actionsWrapper.addEventListener('click', e => e.stopPropagation());
            }

            elements.notificationsList.appendChild(item);
        });
    }

    function createNotificationElement(notification) {
    const item = document.createElement('div');
    item.className = 'notification-item unread'; // Adiciona como não lida por padrão
    item.id = `notification-item-${notification.id}`;

    const data = new Date(notification.dataCriacao).toLocaleString('pt-BR');
    let actionButtonsHtml = '';
    let iconClass = 'fa-info-circle';

    if (notification.tipo === 'PEDIDO_AMIZADE') {
        iconClass = 'fa-user-plus';
        actionButtonsHtml = `
          <div class="notification-actions">
            <button class="btn btn-sm btn-primary" onclick="window.aceitarSolicitacao(${notification.idReferencia}, ${notification.id})">Aceitar</button>
            <button class="btn btn-sm btn-secondary" onclick="window.recusarSolicitacao(${notification.idReferencia}, ${notification.id})">Recusar</button>
          </div>
        `;
    }

    item.innerHTML = `
        <a href="amizades.html" class="notification-link" onclick="window.markNotificationAsRead(event, ${notification.id})">
            <div class="notification-icon-wrapper"><i class="fas ${iconClass}"></i></div>
            <div class="notification-content">
                <p>${notification.mensagem}</p>
                <span class="timestamp">${data}</span>
            </div>
        </a>
        <div class="notification-actions-wrapper">${actionButtonsHtml}</div>
    `;

    const actionsWrapper = item.querySelector('.notification-actions-wrapper');
    if (actionsWrapper) {
        actionsWrapper.addEventListener('click', e => e.stopPropagation());
    }
    return item;
}

    async function markNotificationAsRead(notificationId) {
        const notificationItem = document.getElementById(`notification-item-${notificationId}`);
        if (!notificationItem || !notificationItem.classList.contains('unread')) {
            return;
        }
        notificationItem.classList.remove('unread');
        try {
            await axios.post(`${backendUrl}/api/notificacoes/${notificationId}/ler`);
            fetchNotifications();
        } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error);
            notificationItem.classList.add('unread');
            showNotification('Erro ao atualizar notificação.', 'error');
        }
    }

    // --- FUNÇÕES DE AMIZADES E CONEXÕES ---
    async function fetchFriends() {
        try {
            const response = await axios.get(`${backendUrl}/api/amizades/`);
            userFriends = response.data;
            friendsLoaded = true;
            if (elements.connectionsCount) {
                elements.connectionsCount.textContent = userFriends.length;
            }
            // Renderiza a lista principal de amigos (offline e online)
            renderFriends(userFriends, elements.friendsList);
            // Atualiza o widget de amigos online na sidebar
            atualizarStatusDeAmigosNaUI();
        } catch (error) {
            console.error('Erro ao buscar amigos:', error);
            friendsLoaded = true;
            atualizarStatusDeAmigosNaUI();
        }
    }

    async function fetchReceivedRequests() {
        try {
            const response = await axios.get(`${backendUrl}/api/amizades/pendentes`);
            renderRequests(response.data, elements.receivedRequestsList, 'received');
        } catch (error) {
            console.error('Erro ao buscar pedidos recebidos:', error);
            if (elements.receivedRequestsList) elements.receivedRequestsList.innerHTML = `<p class="empty-state">Não foi possível carregar os pedidos.</p>`;
        }
    }

    async function fetchSentRequests() {
        try {
            const response = await axios.get(`${backendUrl}/api/amizades/enviadas`);
            renderRequests(response.data, elements.sentRequestsList, 'sent');
        } catch (error) {
            console.error('Erro ao buscar pedidos enviados:', error);
            if (elements.sentRequestsList) elements.sentRequestsList.innerHTML = `<p class="empty-state">Não foi possível carregar os pedidos.</p>`;
        }
    }

    function renderRequests(requests, container, type) {
        if (!container) return;
        container.innerHTML = '';
        if (requests.length === 0) {
            container.innerHTML = `<p class="empty-state">Nenhum pedido encontrado.</p>`;
            return;
        }

        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = 'request-card';
            card.id = `${type}-card-${req.idAmizade}`;

            const data = new Date(req.dataSolicitacao).toLocaleDateString('pt-BR');
            const nome = (type === 'received') ? req.nomeSolicitante : req.nomeSolicitado;
            const fotoPath = (type === 'received') ? req.fotoPerfilSolicitante : req.fotoPerfilSolicitado;
            const fotoUrl = fotoPath ? `${backendUrl}${fotoPath}` : defaultAvatarUrl;

            let actionsHtml = '';
            if (type === 'received') {
                actionsHtml = `
                <button class="btn btn-primary" onclick="window.aceitar(${req.idAmizade})">Aceitar</button>
                <button class="btn btn-secondary" onclick="window.recusar(${req.idAmizade})">Recusar</button>
            `;
            } else {
                actionsHtml = `<button class="btn btn-danger" onclick="window.cancelar(${req.idAmizade})">Cancelar Pedido</button>`;
            }

            card.innerHTML = `
            <img src="${fotoUrl}" alt="Foto de ${nome}">
            <h4>${nome}</h4>
            <p class="timestamp">Enviado em: ${data}</p>
            <div class="request-card-actions">${actionsHtml}</div>
        `;
            container.appendChild(card);
        });
    }


   function renderFriends(friends, container) {
        if (!container) return;
        container.innerHTML = '';
        if (friends.length === 0) {
            container.innerHTML = `<p class="empty-state">Você ainda não tem amigos.</p>`;
            return;
        }
        friends.forEach(friend => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.id = `friend-card-${friend.idAmizade}`;
            const fotoUrl = friend.fotoPerfil ? `${backendUrl}/api/arquivos/${friend.fotoPerfil}` : defaultAvatarUrl;
            const actionsHtml = `
                <a href="mensagem.html" class="btn btn-primary"><i class="fas fa-comment-dots"></i> Mensagem</a>
                <button class="btn btn-danger" onclick="window.removerAmizade(${friend.idAmizade})"><i class="fas fa-user-minus"></i> Remover</button>
            `;
            card.innerHTML = `
                <div class="user-card-avatar">
                    <img src="${fotoUrl}" alt="Foto de ${friend.nome}">
                    <div class="status ${friend.online ? 'online' : 'offline'}" data-user-email="${friend.email}"></div>
                </div>
                <div class="user-card-info">
                    <h4>${friend.nome}</h4>
                    <p>${friend.email}</p>
                </div>
                <div class="user-card-action">${actionsHtml}</div>
            `;
            container.appendChild(card);
        });
    }
    /**
    * Função centralizada para atualizar todos os indicadores visuais de amigos online.
    * inclui o widget da sidebar e os pontos de status em qualquer card de usuário.
    */
  function atualizarStatusDeAmigosNaUI() {
    if (!elements.onlineFriendsList) return;

    // Condição de guarda: Só renderiza se a lista de amigos já foi carregada.
    if (!friendsLoaded) {
        elements.onlineFriendsList.innerHTML = '<p class="empty-state">Carregando...</p>';
        return;
    }

    const onlineFriends = userFriends.filter(friend => latestOnlineEmails.includes(friend.email));

    elements.onlineFriendsList.innerHTML = '';
    if (onlineFriends.length === 0) {
        elements.onlineFriendsList.innerHTML = '<p class="empty-state">Nenhum amigo online.</p>';
    } else {
        onlineFriends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'friend-item';
            const friendAvatar = friend.fotoPerfil
                ? `${backendUrl}/api/arquivos/${friend.fotoPerfil}`
                : defaultAvatarUrl;

            friendElement.innerHTML = `
                <div class="avatar"><img src="${friendAvatar}" alt="Avatar de ${friend.nome}"></div>
                <span class="friend-name">${friend.nome}</span>
                <div class="status online"></div>
            `;
            elements.onlineFriendsList.appendChild(friendElement);
        });
    }

    // Lógica para atualizar os pontos de status em outros lugares da página
    const statusDots = document.querySelectorAll('.status[data-user-email]');
    statusDots.forEach(dot => {
        const email = dot.getAttribute('data-user-email');
        if (latestOnlineEmails.includes(email)) {
            dot.classList.add('online');
            dot.classList.remove('offline');
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
        }
    });
  }

    // --- FUNÇÕES DE AÇÃO GLOBAIS ---
    window.aceitar = async (amizadeId) => {
        try {
            await axios.post(`${backendUrl}/api/amizades/aceitar/${amizadeId}`);
            document.getElementById(`received-card-${amizadeId}`).remove();
            showNotification('Amizade aceita!', 'success');
            fetchFriends(); // Atualiza a lista de amigos e o contador
        } catch (err) { console.error(err); }
    };

    window.recusar = async (amizadeId) => {
        try {
            await axios.delete(`${backendUrl}/api/amizades/recusar/${amizadeId}`);
            document.getElementById(`received-card-${amizadeId}`).remove();
        } catch (err) { console.error(err); }
    };

    window.cancelar = async (amizadeId) => {
        try {
            await axios.delete(`${backendUrl}/api/amizades/recusar/${amizadeId}`);
            document.getElementById(`sent-card-${amizadeId}`).remove();
        } catch (err) { console.error(err); }
    };

    window.removerAmizade = async (amizadeId) => {
        if (confirm('Tem certeza que deseja remover esta amizade?')) {
            try {
                await axios.delete(`${backendUrl}/api/amizades/recusar/${amizadeId}`);
                document.getElementById(`friend-card-${amizadeId}`).remove();
                showNotification('Amizade removida.', 'info');
                fetchFriends(); // Atualiza o contador
            } catch (err) {
                console.error('Erro ao remover amizade:', err);
            }
        }
    };

    // --- FUNÇÕES DE MODAIS E MENUS ---
    const closeAllMenus = () => {
        document.querySelectorAll('.options-menu, .dropdown-menu').forEach(m => m.style.display = 'none');
    };

    function openEditProfileModal() {
        if (!currentUser || !elements.editProfileModal) return;
        elements.editProfilePicPreview.src = currentUser.urlFotoPerfil ? `${backendUrl}${currentUser.urlFotoPerfil}` : defaultAvatarUrl;
        elements.editProfileName.value = currentUser.nome;
        elements.editProfileBio.value = currentUser.bio || "";
        if (currentUser.dataNascimento) {
            elements.editProfileDob.value = currentUser.dataNascimento.split("T")[0];
        }
        elements.editProfilePassword.value = "";
        elements.editProfilePasswordConfirm.value = "";
        elements.editProfileModal.style.display = "flex";
    }

    function openDeleteAccountModal() {
        if (elements.deleteConfirmPassword) elements.deleteConfirmPassword.value = "";
        if (elements.deleteAccountModal) elements.deleteAccountModal.style.display = "flex";
    }

    // --- SETUP DOS EVENT LISTENERS ---
    function setupEventListeners() {
        document.body.addEventListener("click", (e) => {
            if (elements.notificationsPanel && !elements.notificationsPanel.contains(e.target) && !elements.notificationsIcon.contains(e.target)) {
                elements.notificationsPanel.style.display = 'none';
            }
            closeAllMenus();
        });

        if (elements.notificationsIcon) {
            elements.notificationsIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                const isVisible = elements.notificationsPanel.style.display === 'block';
                elements.notificationsPanel.style.display = isVisible ? 'none' : 'block';
            });
        }

        if (elements.userDropdownTrigger) {
            elements.userDropdownTrigger.addEventListener("click", (event) => {
                event.stopPropagation();
                const menu = elements.userDropdownTrigger.nextElementSibling;
                if (menu && menu.classList.contains("dropdown-menu")) {
                    const isVisible = menu.style.display === "block";
                    closeAllMenus();
                    if (!isVisible) {
                        menu.style.display = "block";
                    }
                }
            });
        }

        if (elements.logoutBtn) elements.logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "login.html";
        });

        if (elements.editProfileBtn) elements.editProfileBtn.addEventListener("click", openEditProfileModal);
        if (elements.deleteAccountBtn) elements.deleteAccountBtn.addEventListener("click", openDeleteAccountModal);

        if (elements.cancelEditProfileBtn) elements.cancelEditProfileBtn.addEventListener("click", () => (elements.editProfileModal.style.display = "none"));

        if (elements.editProfilePicInput) elements.editProfilePicInput.addEventListener("change", () => {
            const file = elements.editProfilePicInput.files[0];
            if (file && elements.editProfilePicPreview) {
                elements.editProfilePicPreview.src = URL.createObjectURL(file);
            }
        });

        if (elements.editProfileForm) elements.editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            let userUpdated = false;

            if (elements.editProfilePicInput.files[0]) {
                const formData = new FormData();
                formData.append("foto", elements.editProfilePicInput.files[0]);
                try {
                    const response = await axios.put(`${backendUrl}/usuarios/me/foto`, formData);
                    currentUser = response.data;
                    userUpdated = true;
                    showNotification('Foto de perfil atualizada!', 'success');
                } catch (error) {
                    showNotification("Erro ao atualizar a foto.", "error");
                    console.error("Erro na foto:", error);
                }
            }

            const password = elements.editProfilePassword.value;
            const passwordConfirm = elements.editProfilePasswordConfirm.value;
            if (password && password !== passwordConfirm) {
                showNotification("As novas senhas não coincidem.", "error");
                return;
            }
            const updateData = {
                nome: elements.editProfileName.value,
                bio: elements.editProfileBio.value,
                dataNascimento: elements.editProfileDob.value ? new Date(elements.editProfileDob.value).toISOString() : null,
                senha: password || null,
            };

            try {
                const response = await axios.put(`${backendUrl}/usuarios/me`, updateData);
                currentUser = response.data;
                userUpdated = true;
            } catch (error) {
                showNotification("Erro ao atualizar o perfil.", "error");
                console.error("Erro no perfil:", error);
            }

            if (userUpdated) {
                updateUIWithUserData(currentUser);
                showNotification('Perfil atualizado com sucesso!', 'success');
                elements.editProfileModal.style.display = 'none';
            }
        });

        if (elements.cancelDeleteAccountBtn) elements.cancelDeleteAccountBtn.addEventListener("click", () => (elements.deleteAccountModal.style.display = "none"));

        if (elements.deleteAccountForm) elements.deleteAccountForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const password = elements.deleteConfirmPassword.value;
            if (!password) {
                showNotification("Por favor, digite sua senha para confirmar.", "error");
                return;
            }
            try {
                await axios.post(`${backendUrl}/autenticacao/login`, {
                    email: currentUser.email,
                    senha: password,
                });
                if (confirm("Você tem ABSOLUTA CERTEZA? Esta ação não pode ser desfeita.")) {
                    await axios.delete(`${backendUrl}/usuarios/me`);
                    alert("Sua conta foi excluída com sucesso.");
                    localStorage.clear();
                    window.location.href = "login.html";
                }
            } catch (error) {
                showNotification("Senha incorreta. A conta não foi excluída.", "error");
                console.error("Erro na confirmação de senha:", error);
            }
        });
    }

    init();
});