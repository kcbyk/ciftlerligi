import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAnalytics,
  isSupported,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD1hX3rcDEvfv0TiuBOcrr6DKDTlVKAUT0',
  authDomain: 'ciftlerr-7f556.firebaseapp.com',
  projectId: 'ciftlerr-7f556',
  storageBucket: 'ciftlerr-7f556.firebasestorage.app',
  messagingSenderId: '1036995196061',
  appId: '1:1036995196061:web:2daa95ee21337d51d99074',
  measurementId: 'G-B3TJQ5C0WN',
};

const firebaseApp = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
    }
  })
  .catch(() => {
    // Analytics bazi ortamlarda desteklenmeyebilir.
  });

window.FirebaseClient = {
  app: firebaseApp,
  config: firebaseConfig,
};
