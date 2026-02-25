// firebase-config.js
// Initialises Firebase once and exports `auth` for use across the app.
// Imported as a module by login.html and index.html.

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth }
    from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGjJmQJIE07ZL4q7Ola1eSqIGxNxV98DA",
    authDomain: "batchsched-a9448.firebaseapp.com",
    projectId: "batchsched-a9448",
    storageBucket: "batchsched-a9448.firebasestorage.app",
    messagingSenderId: "969977073028",
    appId: "1:969977073028:web:b15b8b3b14c28b2e2461d1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
