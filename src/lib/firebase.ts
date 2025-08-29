import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  "projectId": "complaint-central-mb5pm",
  "appId": "1:898573072628:web:a5ccc617bf5797c334c6a1",
  "storageBucket": "complaint-central-mb5pm.firebasestorage.app",
  "apiKey": "AIzaSyDmKejvRkkUanePoV3I9NVrwF1-j57BdGE",
  "authDomain": "complaint-central-mb5pm.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "898573072628"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
