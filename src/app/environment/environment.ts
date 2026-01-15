const firebaseConfig = {
  apiKey: 'AIzaSyAJdO-FKdTrtzOpNqnYNDhm9nBk0zQ-DJ4',
  authDomain: 'sankeerth-crud.firebaseapp.com',
  projectId: 'sankeerth-crud',
  storageBucket: 'sankeerth-crud.firebasestorage.app',
  messagingSenderId: '851005540046',
  appId: '1:851005540046:web:7ca2775d7f07b2a272729f',
  measurementId: 'G-YC6F4ZHS4Z',
};
export const environment = {
  production: false,
  firebase: {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  },
};
