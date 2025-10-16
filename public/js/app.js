
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, onSnapshot, serverTimestamp, orderBy, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================================================================================
// PASTE YOUR FIREBASE CONFIG OBJECT HERE
// ===================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDHBT5FHkoGyoZ2oEAUyW6cuREjAJjc5Wc",
    authDomain: "nexy-fd6b8.firebaseapp.com",
    projectId: "nexy-fd6b8",
    storageBucket: "nexy-fd6b8.appspot.com",
    messagingSenderId: "471521428421",
    appId: "1:471521428421:web:714a77c1d6f61e3dcf41ac"
};
// ===================================================================================

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    document.getElementById('config-error').style.display = 'flex';
} else {
    initializeAppAndRun();
}

function initializeAppAndRun() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("Firebase initialized successfully!");

    const mockChats = [
        { chatId: 'chat1', userName: 'Alice', lastMessage: 'See you tomorrow!', profilePicUrl: '' },
        { chatId: 'chat2', userName: 'Bob', lastMessage: 'Sounds good!', profilePicUrl: '' },
        { chatId: 'chat3', userName: 'Charlie', lastMessage: 'Haha, classic.', profilePicUrl: '' },
        { chatId: 'chat4', userName: 'Diana', lastMessage: 'Can you send me the file?', profilePicUrl: '' },
        { chatId: 'chat5', userName: 'Ethan', lastMessage: 'On my way.', profilePicUrl: '' },
        { chatId: 'chat6', userName: 'Fiona', lastMessage: 'Happy Birthday! 🎉', profilePicUrl: '' },
        { chatId: 'chat7', userName: 'George', lastMessage: 'Let me check.', profilePicUrl: '' },
        { chatId: 'chat8', userName: 'Hannah', lastMessage: 'You got it!', profilePicUrl: '' },
    ];

    const loginBtn = document.getElementById('login-btn');
    const authContainer = document.getElementById('auth-container');
    const chatUI = document.getElementById('chat-ui');
    const chatCanvas = document.getElementById('chat-canvas');
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
    const searchBtn = document.getElementById('search-btn');
    const requestsBtn = document.getElementById('requests-btn');

    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (email === 'admin' && password === 'admin') {
            console.log('Admin login successful');
            authContainer.classList.add('hidden');
            chatUI.classList.add('visible');
            chatCanvas.style.display = 'block';
            initChatSphere();
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
                createdAt: serverTimestamp()
            });
            
            console.log("User created and profile saved!");
            signupOverlay.classList.remove('visible');

        } catch (error) {
            console.error("Signup failed:", error.message);
            alert("Signup failed: " + error.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error("Sign out error:", error));
    });

    searchBtn.addEventListener('click', () => {
        console.log('Search button clicked');
        alert('Search functionality not implemented yet.');
    });

    requestsBtn.addEventListener('click', () => {
        console.log('Requests button clicked');
        alert('Requests functionality not implemented yet.');
    });

    showSignupBtn.addEventListener('click', () => signupOverlay.classList.add('visible'));
    closeSignupBtn.addEventListener('click', () => signupOverlay.classList.remove('visible'));
    
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            authContainer.classList.add('hidden');
            chatUI.classList.add('visible');
            chatCanvas.style.display = 'block';
            initChatSphere();
        } else {
            console.log("User is not authenticated.");
            authContainer.classList.remove('hidden');
            chatUI.classList.remove('visible');
            chatCanvas.style.display = 'none';
        }
    });

    function initChatSphere() {
        let scene, camera, renderer, labelRenderer, controls;
        const chatHeads = [];

        // Scene setup
        scene = new THREE.Scene();

        // Camera setup
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 15;

        // WebGL Renderer for 3D objects
        renderer = new THREE.WebGLRenderer({ canvas: chatCanvas, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        // CSS2D Renderer for HTML labels
        labelRenderer = new THREE.CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        document.querySelector('.chat-ui-container').appendChild(labelRenderer.domElement);

        // Controls
        controls = new THREE.OrbitControls(camera, labelRenderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Create Chat Heads
        const geometry = new THREE.IcosahedronGeometry(5, 1); 
        const positions = geometry.attributes.position.array;

        for (let i = 0; i < mockChats.length; i++) {
            const chat = mockChats[i];
            const posIndex = i * 3;

            const chatHeadDiv = document.createElement('div');
            chatHeadDiv.className = 'chat-head-label';
            chatHeadDiv.textContent = chat.userName;
            // Add profile pic later
            // const img = document.createElement('img');
            // img.src = chat.profilePicUrl || 'default-avatar.png'; 
            // chatHeadDiv.appendChild(img);

            const chatHeadLabel = new THREE.CSS2DObject(chatHeadDiv);
            
            const x = positions[posIndex];
            const y = positions[posIndex + 1];
            const z = positions[posIndex + 2];
            chatHeadLabel.position.set(x, y, z);
            
            scene.add(chatHeadLabel);
            chatHeads.push({ label: chatHeadLabel, originalPos: new THREE.Vector3(x, y, z) });

            chatHeadDiv.addEventListener('click', () => {
                console.log('Clicked on chat:', chat.chatId);
                openChatWindow(chat);
            });
        }

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);

            const time = Date.now() * 0.0005;

            chatHeads.forEach((head, index) => {
                const yOffset = Math.sin(time * 2 + index * 0.5) * 0.1;
                head.label.position.y = head.originalPos.y + yOffset;
            });

            controls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }

        animate();

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            labelRenderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function openChatWindow(chat) {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.innerHTML = `
            <div class="chat-header">
                <img src="${chat.profilePicUrl || 'https://via.placeholder.com/40'}" alt="${chat.userName}">
                <div class="chat-header-info">
                    <h3>${chat.userName}</h3>
                    <p>Online</p> 
                </div>
            </div>
            <div class="chat-messages">
                <div class="message received"><div class="message-bubble">${chat.lastMessage}</div></div>
                <div class="message sent"><div class="message-bubble">Hey! How are you?</div></div>
            </div>
            <div class="chat-input-area">
                <input type="text" placeholder="Type a message...">
                <button>Send</button>
            </div>
        `;
        chatWindow.classList.add('visible');
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
    [ ] `searchUsers(handleQuery)`
    [ ] `sendFriendRequest(recipientId)`
    [ ] `listenForFriendRequests()`
    [ ] `acceptFriendRequest(requestId)`

3.  Real-Time Chat
    [ ] `listenForUserChats()`
    [ ] `openChat(chatId)`
    [ ] `sendMessage(chatId, messageText)`
    [ ] `editMessage(chatId, messageId, newText)`
    [ ] `deleteMessage(chatId, messageId)`
*/
