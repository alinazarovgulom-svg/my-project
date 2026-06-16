import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyASH72RruqIiBlZLAMrO2H6deV1eO2bpqs",
  authDomain: "pulbek-e324a.firebaseapp.com",
  projectId: "pulbek-e324a",
  storageBucket: "pulbek-e324a.firebasestorage.app",
  messagingSenderId: "882923501531",
  appId: "1:882923501531:web:ef3855ef512bd3edc0d9fe",
  measurementId: "G-W7HJVN33ET"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Oflayn rejimni yoqish
enableIndexedDbPersistence(db).catch(() => {})
