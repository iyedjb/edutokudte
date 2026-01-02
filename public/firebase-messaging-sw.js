// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Default Firebase configuration for the primary database (gepo-86dbb)
// This is used as fallback when config.json is not available
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyAl4zVbM1w38lINLxSpBxM0ymgvqTH3LMU",
  authDomain: "gepo-86dbb.firebaseapp.com",
  databaseURL: "https://gepo-86dbb-default-rtdb.firebaseio.com",
  projectId: "gepo-86dbb",
  storageBucket: "gepo-86dbb.firebasestorage.app",
  messagingSenderId: "858231278875",
  appId: "1:858231278875:web:3ab3b12c030fee60cb57be"
};

let messaging = null;

// Try to fetch config from server, fallback to defaults
async function initializeFirebase() {
  let firebaseConfig = DEFAULT_CONFIG;
  
  try {
    // Try to fetch dynamic config from the server
    const response = await fetch('/api/firebase-config');
    if (response.ok) {
      const config = await response.json();
      if (config && config.apiKey) {
        firebaseConfig = config;
        console.log('Using server-provided Firebase config');
      }
    }
  } catch (error) {
    console.log('Using default Firebase config');
  }

  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || 'Nova notificação';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: payload.data?.notificationId || 'default',
        data: payload.data,
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    console.log('Firebase Messaging initialized successfully');
  } catch (error) {
    console.warn('Firebase Messaging initialization failed:', error.message || error);
  }
}

// Initialize Firebase when service worker activates
self.addEventListener('activate', (event) => {
  event.waitUntil(initializeFirebase());
});

// Also try to initialize on install
self.addEventListener('install', (event) => {
  event.waitUntil(initializeFirebase());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Navigate to the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not open
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
