import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// TODO: Replace with your maosh-tizimi Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCMYFAt0eZsGGLzpWxFqTgk7bTPL2arGS8",
  authDomain: "maosh-tizimi.firebaseapp.com",
  projectId: "maosh-tizimi",
  storageBucket: "maosh-tizimi.firebasestorage.app",
  messagingSenderId: "138300315394",
  appId: "1:138300315394:web:3fe59a22cecfe70153d41b"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
