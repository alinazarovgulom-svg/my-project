import { createContext, useContext, useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const SEED = [
  { id: 'bichuv',    name: "Bichuv bo'limi" },
  { id: 'kamzul',    name: "Kamzul bo'limi" },
  { id: 'shim',      name: "Shim bo'limi" },
  { id: 'tana',      name: "Tana bo'limi" },
  { id: 'astar',     name: "Astar bo'limi" },
  { id: 'montaj',    name: "Montaj bo'limi" },
  { id: 'pardoz',    name: "Pardoz dazmol bo'limi" },
  { id: 'qadoqlash', name: "Qadoqlash bo'limi" },
]

const DepartmentsContext = createContext({ departments: [], loading: true, getDeptName: id => id })

export function DepartmentsProvider({ children }) {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'factory_departments'), orderBy('name'))
    const unsub = onSnapshot(q, async snap => {
      if (snap.empty) {
        const batch = writeBatch(db)
        SEED.forEach(d => batch.set(doc(db, 'factory_departments', d.id), { name: d.name, createdAt: serverTimestamp() }))
        await batch.commit()
      } else {
        setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || id

  const addDept = (name) =>
    addDoc(collection(db, 'factory_departments'), { name: name.trim(), createdAt: serverTimestamp() })

  const updateDept = (id, name) =>
    updateDoc(doc(db, 'factory_departments', id), { name: name.trim() })

  const deleteDept = (id) =>
    deleteDoc(doc(db, 'factory_departments', id))

  return (
    <DepartmentsContext.Provider value={{ departments, loading, getDeptName, addDept, updateDept, deleteDept }}>
      {children}
    </DepartmentsContext.Provider>
  )
}

export const useDepartments = () => useContext(DepartmentsContext)
