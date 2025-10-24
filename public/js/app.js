import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const socket = io('http://localhost:3000'); // Adjust if your server is elsewhere

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const chatUI = document.getElementById('chat-ui');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signupOverlay = document.getElementById('signup-overlay');
    const closeSignupBtn = document.getElementById('close-signup-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signupName = document.getElementById('signup-name');
    const signupHandle = document.getElementById('signup-handle');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const profileOverlay = document.getElementById('profile-overlay');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const profileModalPic = document.querySelector('.profile-modal-pic');
    const profileModalName = document.querySelector('.profile-modal-name');
    const profileModalHandle = document.querySelector('.profile-modal-handle');
    const profileAddBtn = document.getElementById('profile-add-btn');
    const requestsOverlay = document.getElementById('requests-overlay');
    const requestsBtn = document.getElementById('requests-btn');
    const closeRequestsBtn = document.getElementById('close-requests-btn');
    const requestsList = document.getElementById('requests-list');
    const chatWindow = document.getElementById('chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatHeaderName = document.querySelector('.chat-header-info h3');
    const chatMessages = document.querySelector('.chat-messages');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    const historyBtn = document.getElementById('history-btn');
    const chatHistory = document.getElementById('chat-history');
    const chatHistoryList = document.querySelector('.chat-history-list');
    const userProfile = document.getElementById('user-profile');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const messageContextMenu = document.getElementById('message-context-menu');
    const editMessageBtn = document.getElementById('edit-message-btn');
    const deleteMessageBtn = document.getElementById('delete-message-btn');

    let currentChatId = null;
    let activeMessageId = null;

    // --- Helper Functions ---

    async function initializeAppUI(user) {
        authContainer.classList.add('hidden');
        chatUI.classList.add('visible');

        const userProfileDiv = document.getElementById('user-profile');
        userProfileDiv.innerHTML = `
            <img src="${user.profilePictureUrl || 'https://via.placeholder.com/40'}" alt="My Profile" id="top-bar-profile-pic">
            <div class="user-profile-name">${user.username}</div>
            <div class="user-profile-handle">${user.email}</div>
        `;

        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/chats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch chats.');
            currentUser.chats = await response.json();
        } catch (error) {
            console.error('Error fetching chats:', error);
            currentUser.chats = [];
        }

        socket.connect();
        socket.emit('setOnline', user.userId);
        renderChatHistory(currentUser.chats);
    }

    function renderChatHistory(chats) {
        chatHistoryList.innerHTML = '';
        if (!chats || chats.length === 0) {
            chatHistoryList.innerHTML = '<p style="padding: 15px; text-align: center;">No chats yet.</p>';
            return;
        }
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'chat-history-item';
            item.dataset.chatId = chat.chatId;
            item.dataset.otherUsername = chat.otherUsername;
            item.dataset.otherProfilePic = chat.otherProfilePic || 'https://via.placeholder.com/40';
            item.innerHTML = `
                <img src="${chat.otherProfilePic || 'https://via.placeholder.com/40'}" alt="${chat.otherUsername}">
                <div class="chat-history-info">
                    <h4>${chat.otherUsername}</h4>
                    <p>${chat.lastMessage || '&nbsp;'}</p>
                </div>
            `;
            chatHistoryList.appendChild(item);
        });
    }

    async function openChatWindow(chatId, otherUser) {
        currentChatId = chatId;
        socket.emit('joinChat', chatId);
        socket.emit('markMessagesAsRead', { chatId, userId: currentUser.userId });

        chatHeaderName.textContent = otherUser.username;
        chatMessages.innerHTML = '';

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch messages.');
            const messages = await response.json();
            messages.forEach(msg => appendMessage(msg, false));
            chatWindow.classList.add('visible');
        } catch (error) {
            console.error('Error opening chat:', error);
            alert('Could not open chat.');
        }
    }

    function appendMessage(message, isNew = true) {
        const messageId = message.messageId || `temp-${Date.now()}`;
        let messageDiv = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
        
        const isSent = message.senderId === currentUser.userId;

        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.dataset.messageId = messageId;
            chatMessages.appendChild(messageDiv);
        }
        
        messageDiv.className = 'message ' + (isSent ? 'sent' : 'received');

        let contentHtml;
        if (message.imageUrl) {
            contentHtml = `<img src="${message.imageUrl}" class="chat-image" alt="Chat Image">`;
        } else {
            contentHtml = `<div class="message-bubble">${message.content}</div>`;
        }
        messageDiv.innerHTML = contentHtml;

        if(message.isEdited) {
            const editedIndicator = document.createElement('span');
            editedIndicator.className = 'edited-indicator';
            editedIndicator.textContent = '(edited)';
            messageDiv.querySelector('.message-bubble')?.appendChild(editedIndicator);
        }

        if (isNew) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // --- Event Listeners ---

    // Initial Authentication
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return alert('Please enter email and password.');
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            initializeAppUI(data.user);
        } catch (error) {
            console.error('Login failed:', error);
        }
    });
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        location.reload();
    });

    // Signup Modal
    showSignupBtn.addEventListener('click', () => signupOverlay.classList.add('visible'));
    closeSignupBtn.addEventListener('click', () => signupOverlay.classList.remove('visible'));
    signupBtn.addEventListener('click', async () => {
        const name = signupName.value;
        const handle = signupHandle.value;
        const email = signupEmail.value;
        const password = signupPassword.value;
        if (!name || !handle || !email || !password) return alert('Please fill out all fields.');
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: name, handle, email, password })
            });
            if (!response.ok) throw new Error((await response.json()).message);
            alert('Registration successful! Please log in.');
            signupOverlay.classList.remove('visible');
        } catch (error) {
            console.error('Signup failed:', error);
            alert('Signup failed: ' + error.message);
        }
    });

    // Main UI Interactions
    historyBtn.addEventListener('click', () => chatHistory.classList.toggle('visible'));
    requestsBtn.addEventListener('click', async () => {
        requestsOverlay.classList.add('visible');
        // Additional logic... 
    });
    closeRequestsBtn.addEventListener('click', () => requestsOverlay.classList.remove('visible'));

    // Self Profile
    userProfile.addEventListener('click', () => {
        profileOverlay.classList.add('self-profile');
        profileModalPic.style.cursor = 'pointer';
        profileModalPic.src = currentUser.profilePictureUrl || 'https://via.placeholder.com/40';
        profileModalName.textContent = currentUser.username;
        profileModalHandle.textContent = currentUser.email;
        profileAddBtn.style.display = 'none';
        profileOverlay.classList.add('visible');
    });

    // Overlays Closing
    [signupOverlay, profileOverlay, requestsOverlay].forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
                if (overlay === profileOverlay) {
                    profileOverlay.classList.remove('self-profile');
                    profileModalPic.style.cursor = 'default';
                    profileAddBtn.style.display = 'block';
                }
            }
        });
    });
    closeProfileBtn.addEventListener('click', () => {
        profileOverlay.classList.remove('visible', 'self-profile');
        profileModalPic.style.cursor = 'default';
        profileAddBtn.style.display = 'block';
    });

    // Search and Chat List Interactions
    searchResults.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.search-result-item');
        if (!resultItem) return;
        const { userId, username, profilePictureUrl } = resultItem.dataset;
        if (e.target.classList.contains('add-friend-btn')) {
            profileModalPic.src = profilePictureUrl;
            // Other fields... 
            profileOverlay.classList.add('visible');
        } else if (e.target.classList.contains('start-chat-btn')) {
            const chatId = e.target.dataset.chatId;
            openChatWindow(chatId, { username, profilePictureUrl });
        }
    });

    chatHistoryList.addEventListener('click', (e) => {
        const chatItem = e.target.closest('.chat-history-item');
        if (!chatItem) return;
        const { chatId, otherUsername, otherProfilePic } = chatItem.dataset;
        openChatWindow(chatId, { username: otherUsername, profilePictureUrl: otherProfilePic });
    });

    chatHistoryList.addEventListener('scroll', () => {
        const listCenter = chatHistoryList.scrollTop + chatHistoryList.offsetHeight / 2;
        const items = chatHistoryList.querySelectorAll('.chat-history-item');
        items.forEach(item => {
            const itemCenter = item.offsetTop + item.offsetHeight / 2;
            const distance = listCenter - itemCenter;
            const rotation = Math.max(-30, Math.min(30, distance * 0.1)); // Clamp rotation between -30 and 30 degrees
            item.style.transform = `rotateY(${rotation}deg)`;
        });
    });

    // Image Uploads
    uploadBtn.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', async (e) => { /* ... */ });
    profileImageUpload.addEventListener('change', async (e) => { /* ... */ });

    // Message Sending
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    sendBtn.addEventListener('click', () => {
        const text = messageInput.value;
        if (!text.trim() || !currentUser || !currentChatId) return;
        const message = { chatId: currentChatId, senderId: currentUser.userId, content: text };
        socket.emit('sendMessage', message);
        appendMessage({ ...message, messageId: `temp-${Date.now()}` });
        messageInput.value = '';
    });
    messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } });

    // Context Menu for Messages
    let contextMenuTargetMessage = null;
    chatMessages.addEventListener('contextmenu', e => {
        const msgElement = e.target.closest('.message.sent');
        if(!msgElement) return;
        e.preventDefault();
        contextMenuTargetMessage = msgElement;
        messageContextMenu.style.left = `${e.clientX}px`;
        messageContextMenu.style.top = `${e.clientY}px`;
        messageContextMenu.style.display = 'block';
    });
    window.addEventListener('click', () => { messageContextMenu.style.display = 'none'; });
    deleteMessageBtn.addEventListener('click', () => { 
        const messageId = contextMenuTargetMessage.dataset.messageId; 
        socket.emit('deleteMessage', { messageId, chatId: currentChatId, userId: currentUser.userId }); 
    });
    editMessageBtn.addEventListener('click', () => {
        if (!contextMenuTargetMessage) return;
        const bubble = contextMenuTargetMessage.querySelector('.message-bubble');
        if (!bubble) return; // Can't edit images

        const currentText = bubble.textContent.replace(' (edited)',''); // Remove existing edited tag
        bubble.innerHTML = `<input type="text" class="edit-message-input" value="${currentText}">`;
        const input = bubble.querySelector('input');
        input.focus();

        const messageId = contextMenuTargetMessage.dataset.messageId;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                socket.emit('editMessage', {
                    messageId,
                    chatId: currentChatId,
                    userId: currentUser.userId,
                    newContent: e.target.value
                });
                // The UI will be updated by the messageUpdated event
            } else if (e.key === 'Escape') {
                bubble.textContent = currentText;
            }
        });
    });


    // --- Socket.IO Listeners ---
    socket.on('messageUpdated', updatedMessage => {
        const messageElement = chatMessages.querySelector(`[data-message-id="${updatedMessage.messageId}"]`);
        if (messageElement) {
            const bubble = messageElement.querySelector('.message-bubble');
            if (bubble) {
                bubble.textContent = updatedMessage.content;
                if(updatedMessage.isEdited) {
                    const editedIndicator = document.createElement('span');
                    editedIndicator.className = 'edited-indicator';
                    editedIndicator.textContent = ' (edited)';
                    bubble.appendChild(editedIndicator);
                }
            }
        }
    });
    socket.on('messagesWereRead', ({ chatId }) => { /* ... */ });
    socket.on('newMessage', (message) => {
        if (message.chatId === currentChatId) {
            appendMessage(message);
        }
        // TODO: update chat history list with new message preview
    });

    // --- Initial Load ---
    const token = localStorage.getItem('token');
    if (token) {
        // Fetch user data with token and initialize app
    } else {
        authContainer.classList.add('visible');
    } 
});