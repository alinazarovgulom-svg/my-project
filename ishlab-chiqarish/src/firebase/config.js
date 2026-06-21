import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDAGKw5FHLh_dyDC6dvQeJUzX7Xi34fYWk",
  authDomain: "ishlab-chiqarish-ec750.firebaseapp.com",
  projectId: "ishlab-chiqarish-ec750",
  storageBucket: "ishlab-chiqarish-ec750.firebasestorage.app",
  messagingSenderId: "329770242502",
  appId: "1:329770242502:web:f7bf311986e0478404e2c7"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
