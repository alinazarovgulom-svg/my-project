import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyASH72RruqIiBlZLAMrO2H6deV1eO2bpqs",
  authDomain: "pulbek-e324a.firebaseapp.com",
  projectId: "pulbek-e324a",
  storageBucket: "pulbek-e324a.firebasestorage.app",
  messagingSenderId: "882923501531",
  appId: "1:882923501531:web:ef3855ef512bd3edc0d9fe",
}

const appName = 'factory'
const app = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName)

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})
