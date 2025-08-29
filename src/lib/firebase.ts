import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCsko2cgUUBZQSARDLTbp8mip0SX62wh74",
  authDomain: "passengers-map-71296.firebaseapp.com",
  databaseURL: "https://passengers-map-71296-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "passengers-map-71296",
  storageBucket: "passengers-map-71296.firebasestorage.app",
  messagingSenderId: "600735656422",
  appId: "1:600735656422:web:90974da8fb5ce5fdc84e27",
  measurementId: "G-0FCR3GDMTR"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
