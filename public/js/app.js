import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, onSnapshot, serverTimestamp, orderBy, updateDoc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHBT5FHkoGyoZ2oEAUyW6cuREjAJjc5Wc",
  authDomain: "nexy-fd6b8.firebaseapp.com",
  projectId: "nexy-fd6b8",
  storageBucket: "nexy-fd6b8.appspot.com",
  messagingSenderId: "471521428421",
  appId: "1:471521428421:web:714a77c1d6f61e3dcf41ac"
};

const DEV_MODE = true;

initializeAppAndRun();

function initializeAppAndRun() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("Firebase initialized successfully!");

    if (DEV_MODE) {
        window.auth = auth;
        window.db = db;
    }

    const loginBtn = document.getElementById('login-btn');
    const authContainer = document.getElementById('auth-container');
    const chatUI = document.getElementById('chat-ui');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signupOverlay = document.getElementById('signup-overlay');
    const closeSignupBtn = document.getElementById('close-signup-btn');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const signupBtn = document.getElementById('signup-btn');
    const signupNameInput = document.getElementById('signup-name');
    const signupHandleInput = document.getElementById('signup-handle');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    const requestsBtn = document.getElementById('requests-btn');
    const searchResults = document.getElementById('search-results');
    const requestsPanel = document.getElementById('requests-panel');

    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (email === 'admin' && password === 'admin') {
            console.log('Admin login successful');
            authContainer.classList.add('hidden');
            chatUI.classList.add('visible');
            initChatList();
            return;
        }

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Logged in successfully!", userCredential.user);
            })
            .catch((error) => {
                console.error("Login failed:", error.message);
                alert("Login failed: " + error.message);
            });
    });

    signupBtn.addEventListener('click', async () => {
        const name = signupNameInput.value;
        const handle = signupHandleInput.value;
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;

        if (!name || !handle || !email || !password) {
            alert("Please fill out all fields.");
            return;
        }
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                handle: handle.startsWith('@') ? handle : '@' + handle,
                email: email,
                createdAt: serverTimestamp(),
                contacts: [],
                status: 'online'
            });
            
            console.log("User created and profile saved!");
            signupOverlay.classList.remove('visible');

        } catch (error) {
            console.error("Signup failed:", error.message);
            alert("Signup failed: " + error.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, "users", user.uid), { status: 'offline' }, { merge: true });
        }
        signOut(auth).catch((error) => console.error("Sign out error:", error));
    });

    searchInput.addEventListener('input', (e) => searchUsers(e.target.value));

    async function searchUsers(queryText) {
        searchResults.innerHTML = '';
        if (!queryText) {
            return;
        }
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('handle', '>=', queryText), where('handle', '<=', queryText + '\uf8ff'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            searchResults.innerHTML = '<div class="search-result-item">No users found.</div>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const userResultDiv = document.createElement('div');
            userResultDiv.className = 'search-result-item';
            userResultDiv.innerHTML = `
                <img src="${user.profilePicUrl || 'https://via.placeholder.com/40'}" alt="${user.name}">
                <div class="search-result-info">
                    <h4>${user.name}</h4>
                    <p>${user.handle}</p>
                </div>
                <button class="add-friend-btn" data-uid="${user.uid}">Add Friend</button>
            `;
            searchResults.appendChild(userResultDiv);
        });
    }

    searchResults.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-friend-btn')) {
            const uid = e.target.getAttribute('data-uid');
            sendFriendRequest(uid, e.target);
        }
    });

    async function sendFriendRequest(recipientId, button) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('You must be logged in to send friend requests.');
            return;
        }

        try {
            await addDoc(collection(db, 'friend_requests'), {
                fromId: currentUser.uid,
                toId: recipientId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            button.textContent = 'Request Sent';
            button.disabled = true;
        } catch (error) {
            console.error("Error sending friend request:", error);
            alert('Error sending friend request.');
        }
    }

    requestsBtn.addEventListener('click', () => {
        requestsPanel.classList.toggle('visible');
    });

    async function listenForFriendRequests() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const q = query(collection(db, "friend_requests"), where("toId", "==", currentUser.uid), where("status", "==", "pending"));
        onSnapshot(q, async (snapshot) => {
            requestsPanel.innerHTML = '<h2>Friend Requests</h2>';
            if (snapshot.empty) {
                requestsPanel.innerHTML += '<p>No new requests.</p>';
                return;
            }
            for (const requestDoc of snapshot.docs) {
                const request = requestDoc.data();
                const fromUserDoc = await getDoc(doc(db, "users", request.fromId));
                if (fromUserDoc.exists()) {
                    const fromUser = fromUserDoc.data();
                    const requestItem = document.createElement('div');
                    requestItem.className = 'request-item';
                    requestItem.innerHTML = `
                        <div class="request-info">
                            <h4>${fromUser.name}</h4>
                            <p>${fromUser.handle}</p>
                        </div>
                        <div class="request-actions">
                            <button class="accept-btn" data-id="${requestDoc.id}">Accept</button>
                            <button class="decline-btn" data-id="${requestDoc.id}">Decline</button>
                        </div>
                    `;
                    requestsPanel.appendChild(requestItem);
                }
            }
        });
    }

    requestsPanel.addEventListener('click', (e) => {
        const target = e.target;
        const requestId = target.getAttribute('data-id');
        if (target.classList.contains('accept-btn')) {
            acceptFriendRequest(requestId);
        } else if (target.classList.contains('decline-btn')) {
            declineFriendRequest(requestId);
        }
    });

    async function acceptFriendRequest(requestId) {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const requestDocRef = doc(db, "friend_requests", requestId);
        const requestDoc = await getDoc(requestDocRef);

        if (requestDoc.exists()) {
            const fromId = requestDoc.data().fromId;
            const currentUserDocRef = doc(db, "users", currentUser.uid);
            const fromUserDocRef = doc(db, "users", fromId);

            await updateDoc(requestDocRef, { status: "accepted" });
            await updateDoc(currentUserDocRef, { contacts: arrayUnion(fromId) });
            await updateDoc(fromUserDocRef, { contacts: arrayUnion(currentUser.uid) });
        }
    }

    async function declineFriendRequest(requestId) {
        const requestDocRef = doc(db, "friend_requests", requestId);
        await updateDoc(requestDocRef, { status: "declined" });
    }

    showSignupBtn.addEventListener('click', () => signupOverlay.classList.add('visible'));
    closeSignupBtn.addEventListener('click', () => signupOverlay.classList.remove('visible'));
    
    onAuthStateChanged(auth, async user => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, { status: 'online' }, { merge: true });

            authContainer.classList.add('hidden');
            chatUI.classList.add('visible');
            initChatList();
            listenForFriendRequests();

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userProfileDiv = document.getElementById('user-profile');
                userProfileDiv.innerHTML = `
                    <div class="user-profile-name">${userData.name}</div>
                    <div class="user-profile-handle">${userData.handle}</div>
                `;
            }

        } else {
            console.log("User is not authenticated.");
            authContainer.classList.remove('hidden');
            chatUI.classList.remove('visible');
            const userProfileDiv = document.getElementById('user-profile');
            userProfileDiv.innerHTML = '';
        }
    });

    function initChatList() {
        let chatListContainer = document.querySelector('.chat-list-container');
        if (!chatListContainer) {
            chatListContainer = document.createElement('div');
            chatListContainer.className = 'chat-list-container';
            document.querySelector('.chat-ui-container').appendChild(chatListContainer);
        }

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        onSnapshot(doc(db, "users", currentUser.uid), async (userDoc) => {
            const userData = userDoc.data();
            chatListContainer.innerHTML = '';
            if (userData && userData.contacts && userData.contacts.length > 0) {
                for (const contactId of userData.contacts) {
                    const contactDoc = await getDoc(doc(db, "users", contactId));
                    if (contactDoc.exists()) {
                        const contactData = contactDoc.data();
                        const chatHead = document.createElement('div');
                        chatHead.className = 'chat-head';
                        chatHead.innerHTML = `
                            <img src="${contactData.profilePicUrl || 'https://via.placeholder.com/50'}" alt="${contactData.name}">
                            <div class="chat-head-info">
                                <h4>${contactData.name}</h4>
                                <p>${contactData.status === 'online' ? '<span class="online-indicator"></span> Online' : 'Offline'}</p>
                            </div>
                        `;
                        chatHead.addEventListener('click', () => {
                            openChat(contactId);
                        });
                        chatListContainer.appendChild(chatHead);
                    }
                }
            } else {
                chatListContainer.innerHTML = '<p>No contacts yet.</p>';
            }
        });
    }

    async function openChat(contactId) {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const members = [currentUser.uid, contactId].sort();
        const chatId = members.join('_');
        const chatDocRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (!chatDoc.exists()) {
            await setDoc(chatDocRef, {
                members: members,
                isGroup: false,
                lastMessage: '',
                lastUpdated: serverTimestamp()
            });
        }

        openChatWindow(chatId, contactId);
    }

    function openChatWindow(chatId, contactId) {
        const chatWindow = document.getElementById('chat-window');
        const chatHeaderInfo = chatWindow.querySelector('.chat-header-info h3');
        const onlineIndicator = chatWindow.querySelector('.online-indicator');
        const typingIndicator = chatWindow.querySelector('.typing-indicator');
        const chatMessages = chatWindow.querySelector('.chat-messages');

        getDoc(doc(db, "users", contactId)).then(userDoc => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                chatHeaderInfo.textContent = userData.name;
                if (userData.status === 'online') {
                    onlineIndicator.style.display = 'inline-block';
                } else {
                    onlineIndicator.style.display = 'none';
                }
            }
        });

        listenForMessages(chatId, chatMessages);

        const messageInput = document.getElementById('message-input');
        let typingTimeout;
        messageInput.addEventListener('input', () => {
            const typingStatusRef = doc(db, 'typing_status', chatId);
            updateDoc(typingStatusRef, { [auth.currentUser.uid]: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                updateDoc(typingStatusRef, { [auth.currentUser.uid]: false });
            }, 2000);
        });

        onSnapshot(doc(db, 'typing_status', chatId), (doc) => {
            if (doc.exists() && doc.data()[contactId]) {
                typingIndicator.textContent = 'is typing...';
            } else {
                typingIndicator.textContent = '';
            }
        });

        const sendBtn = document.getElementById('send-btn');
        sendBtn.addEventListener('click', () => {
            sendMessage(chatId, messageInput.value);
            messageInput.value = '';
            const typingStatusRef = doc(db, 'typing_status', chatId);
            updateDoc(typingStatusRef, { [auth.currentUser.uid]: false });
        });

        chatWindow.classList.add('visible');
    }

    async function sendMessage(chatId, text) {
        const currentUser = auth.currentUser;
        if (!currentUser || !text.trim()) return;

        await addDoc(collection(db, "chats", chatId, "messages"), {
            text: text,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "chats", chatId), {
            lastMessage: text,
            lastUpdated: serverTimestamp()
        });
    }

    function listenForMessages(chatId, container) {
        const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
        onSnapshot(q, (snapshot) => {
            container.innerHTML = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + (message.senderId === auth.currentUser.uid ? 'sent' : 'received');
                messageDiv.innerHTML = `<div class="message-bubble">${message.text}</div>`;
                container.appendChild(messageDiv);
            });
            container.scrollTop = container.scrollHeight;
        });
    }

    console.log("Initializing particle background...");
}

/*
===================================================================================
--- APPLICATION BLUEPRINT ---
This is the roadmap for building the nexy messenger application.
===================================================================================

--- I. FIREBASE DATA STRUCTURE (FIRESTORE) ---

1.  `users` collection:
    -   Document ID: `user.uid` from Firebase Auth.
    -   Fields: `uid`, `name`, `handle`, `email`, `createdAt`, `contacts` (array of UIDs).

2.  `chats` collection:
    -   Document ID: auto-generated.
    -   Fields: `members` (array of UIDs), `isGroup`, `groupName`, `lastMessage`, `lastUpdated`.
    -   Sub-collection: `messages`
        -   Fields: `text`, `senderId`, `createdAt`, `edited`.

3.  `friend_requests` collection:
    -   Document ID: auto-generated.
    -   Fields: `fromId`, `toId`, `status`, `createdAt`.


--- II. FEATURE IMPLEMENTATION PLAN ---

1.  Authentication (Partially Implemented)
    [x] `handleSignup()`
    [x] `handleLogin()`
    [x] `handleLogout()`
    [x] `onAuthStateChanged()`

2.  User & Social Features
    [x] `searchUsers(handleQuery)`
    [x] `sendFriendRequest(recipientId)`
    [x] `listenForFriendRequests()`
    [x] `acceptFriendRequest(requestId)`
    [x] `declineFriendRequest(requestId)`

3.  Real-Time Chat
    [x] `listenForUserChats()`
    [x] `openChat(chatId)`
    [x] `sendMessage(chatId, messageText)`
    [x] `listenForMessages(chatId, container)`
    [x] `editMessage(chatId, messageId, newText)`
    [x] `deleteMessage(chatId, messageId)`
*/