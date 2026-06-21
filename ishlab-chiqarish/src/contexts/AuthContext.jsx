import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setUserDoc(null)
        setLoading(false)
        return
      }

      try {
        const ref = doc(db, 'factory_users', firebaseUser.uid)
        const snap = await getDoc(ref)

        if (snap.exists()) {
          setUser(firebaseUser)
          setUserDoc(snap.data())
        } else {
          // First ever user becomes admin
          const usersQ = query(collection(db, 'factory_users'), limit(1))
          const usersSnap = await getDocs(usersQ)
          if (usersSnap.empty) {
            const adminDoc = {
              name: firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role: 'admin',
              createdAt: serverTimestamp(),
            }
            await setDoc(ref, adminDoc)
            setUser(firebaseUser)
            setUserDoc(adminDoc)
          } else {
            // Check pending
            const emailKey = firebaseUser.email.replace(/[.@]/g, '_')
            const pendingRef = doc(db, 'factory_pending', emailKey)
            const pendingSnap = await getDoc(pendingRef)
            if (pendingSnap.exists()) {
              const newDoc = {
                name: pendingSnap.data().name,
                email: firebaseUser.email,
                role: pendingSnap.data().role,
                createdAt: serverTimestamp(),
              }
              await setDoc(ref, newDoc)
              setUser(firebaseUser)
              setUserDoc(newDoc)
            } else {
              await firebaseSignOut(auth)
              setError('Kirish taqiqlangan. Admin bilan bog\'laning.')
              setUser(null)
              setUserDoc(null)
            }
          }
        }
      } catch (e) {
        console.error(e)
        await firebaseSignOut(auth)
        setUser(null)
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (email, password) => {
    setError('')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signOut = () => firebaseSignOut(auth)

  const role = userDoc?.role || null
  const can = {
    viewAll: ['admin', 'viewer', 'reporter', 'entry'].includes(role),
    editData: ['admin', 'entry'].includes(role),
    enterHourly: ['admin', 'entry', 'hourly'].includes(role),
    downloadReports: ['admin', 'reporter'].includes(role),
    manageMembers: role === 'admin',
    manageOperations: ['admin', 'entry'].includes(role),
    manageEmployees: ['admin', 'entry'].includes(role),
  }

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, error, setError, signIn, signOut, role, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
