import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
          if (snap.data().disabled) {
            await firebaseSignOut(auth)
            setError('Kirish taqiqlangan. Admin bilan bog\'laning.')
            setUser(null)
            setUserDoc(null)
          } else {
            setUser(firebaseUser)
            setUserDoc(snap.data())
          }
        } else {
          // First ever user becomes admin
          const usersQ = query(collection(db, 'factory_users'), limit(1))
          const usersSnap = await getDocs(usersQ)
          if (usersSnap.empty) {
            const adminDoc = {
              name: firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              roles: ['admin'],
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
              const pd = pendingSnap.data()
              const newDoc = {
                name: pd.name,
                email: firebaseUser.email,
                roles: pd.roles || (pd.role ? [pd.role] : ['viewer']),
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
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const signIn = async (email, password) => {
    setError('')
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email, password) => {
    setError('')
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const signOut = () => firebaseSignOut(auth)

  // Support both old `role` string and new `roles` array
  const roles = userDoc?.roles || (userDoc?.role ? [userDoc.role] : [])
  const role = roles[0] || null
  const can = {
    viewAll: roles.some(r => ['admin', 'viewer', 'reporter', 'entry'].includes(r)),
    editData: roles.some(r => ['admin', 'entry'].includes(r)),
    enterHourly: roles.some(r => ['admin', 'entry', 'hourly'].includes(r)),
    downloadReports: roles.some(r => ['admin', 'reporter'].includes(r)),
    manageMembers: roles.includes('admin'),
    manageOperations: roles.some(r => ['admin', 'entry'].includes(r)),
    manageEmployees: roles.some(r => ['admin', 'entry'].includes(r)),
  }

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, error, setError, signIn, signUp, signOut, role, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
