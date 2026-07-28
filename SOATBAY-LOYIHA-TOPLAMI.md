# Soatbay analitika (KAFTIMDA) — Loyiha to'plami / Project bundle

> Bu hujjat boshqa AI (Claude) loyiha bilan tanishishi uchun tayyorlangan.
> Ichida: loyiha haqida umumiy ma'lumot + barcha asosiy manba kodlar.

---

## 1. Loyiha nima qiladi

Kichik fabrika uchun **ishlab chiqarishni boshqarish** tizimi (PWA web-app):
- Smena bo'yicha ish kiritish (xodim × operatsiya × miqdor), davomat.
- Bo'limlar, operatsiyalar, xodimlar, a'zolar (rollar) boshqaruvi.
- Hisobotlar: PDF / Excel / Telegram bot, oylik/haftalik hisobot.
- Zanjir tahlili (Pipeline), TV displey, Dashboard grafiklari.
- **Buyurtma (order) tizimi**: buyurtmalar, bo'limlar zanjiri, FIFO taqsimlash,
  progress, tiqilish (bottleneck), tugash prognozi.

## 2. Texnologiyalar

- **Frontend:** React 18 + Vite, PWA, Tailwind CSS, lucide-react (ikonalar),
  react-router-dom, recharts (grafiklar), date-fns.
- **Backend/DB:** Firebase Firestore + Firebase Authentication.
- **Serverless:** Vercel `/api/*` funksiyalari (Telegram bot, PDF, hisobotlar).
- **Hosting:** Vercel (main'ga merge → avtomatik deploy).

## 3. Rollar va ruxsatlar (AuthContext)

`userDoc.roles` massivi. `can` bayroqlari:
- `admin` — hammasi. `manageMembers` = faqat admin.
- `entry` — ma'lumot kiritish (`editData`, `enterHourly`, `manageOperations`, `manageEmployees`).
- `hourly` — soatbay kiritish. `reporter` — hisobot. `viewer` — ko'rish.
Foydalanuvchi `departmentIds` bilan cheklanishi mumkin (o'z bo'limlari).

## 4. Firestore kolleksiyalar

`factory_employees`, `factory_operations`, `factory_work_entries`,
`factory_absences`, `factory_users`, `factory_departments`, `factory_pending`,
`factory_shifts`, `factory_updates` (TV signal), `factory_orders`.

**Work entry ID formati:** `${date}_${deptId}_${startHHMM}_${endHHMM}_${empId}`.

**work_entry hujjati (asosiy):**
```
{
  employeeId, departmentId, date, startTime, endTime, breakMinutes,
  operations: {
    [opId]: {
      quantity,        // UMUMIY miqdor (barcha ulushlar yig'indisi)
      note, norm, expected, unitPrice, piecePay,
      orderId,         // null | 'auto'(FIFO) | buyurtma id (bitta bo'lsa)
      allocations?: [  // bir operatsiya bir necha buyurtmага bo'linsa
        { quantity, orderId, note }
      ]
    }
  },
  orderId,   // yozuv darajasidagi (eski model / bitta buyurtma)
  orderIds,  // [ ...distinct order ids... ] — array-contains so'rovi uchun
  salaryType, hourlyRate, totalPay, isGuest?, homeDepartmentId?, updatedAt, updatedBy
}
```

**Operatsiya (factory_operations):** `{ name, norm, unitPrice, departmentId, order, isFinal, isFirst }`.
- `isFinal` = bo'limning "tayyor mahsulot" operatsiyasi (har bo'limда bitta).
- `isFirst` = bo'limning boshlang'ich (kirim) operatsiyasi.
- `order` = Operatsiyalar sahifasidagi tartib.

**Buyurtma (factory_orders):** `{ name, quantity, departmentId, order(navbat/FIFO), status, isActive, createdAt }`.

**Bo'lim (factory_departments):** `{ name, telegramThreadId, chainInput }`.
`chainInput = { mode: 'order'|'from', sources: [deptId...], rule: 'min'|'sum'|'mirror' }`.
- `mode:'order'` = mustaqil (o'zi buyurtma kirim qiladi).
- `mode:'from'` = zanjir yakuni (masalan Montaj) — kirim manba bo'limlaridan.

## 5. Buyurtma tizimi mantiqi (utils/orderProgress.js)

- `computeOrderChain(order, entries, opById, departments)` — buyurtma bo'yicha
  har bo'lim kirim/chiqim/qoldiq, tiqilish (bo'lim va operatsiya), doneQty, percent.
- `allocationsOf(entry, opVal)` — operatsiya ulushlarини (allocations yoki bitta) qaytaradi.
- FIFO: 'auto' teglangan chiqim navbat (order.order) bo'yicha buyurtmalarga taqsimlanadi;
  har bo'lim o'z zanjir guruhidagi buyurtmalarga.
- `forecastOrder(order, doneQty)` — o'rtacha tezlik bo'yicha tugash sanasi prognozi.
- `utils/orderReport.js` `fetchOrderSummary(db, orderIds, targetDeptId)` — PDF/Telegram
  hisoboti uchun buyurtma xulosasi (bo'lim berilса — shu bo'lim nuqtai nazaridan).

## 6. Hisobotlar

- `utils/pdf.js` `buildWorkPDFHtml(...)` — smena/hisobot PDF HTML (Telegram/print uchun).
- `utils/excel.js` — Excel eksport. `utils/telegram.js` — Telegram yuborish (klient).
- `api/*` — server funksiyalar: `daily-report.js` (kunlik avto hisobot),
  `send-telegram-pdf.js`, `html-to-telegram-pdf.js`, `weekly/monthly-employee-report.js`,
  `send-message.js`. **Telegram token faqat Vercel env'da** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).

## 7. Sahifalar (src/pages)

Dashboard, Attendance (davomat), Pipeline (zanjir tahlili), Orders (buyurtmalar),
Operations (operatsiyalar), Employees (xodimlar), EmployeeCard, DepartmentWork
(smena kiritish — asosiy sahifa), Departments (bo'limlar + zanjir sozlash),
Reports (hisobotlar), MonthlyReport, Shifts (smena jadvali), Members (a'zolar/rollar),
Settings, TVDisplay (TV), Login.

## 8. Muhim eslatmalar / ochiq muammolar

- **Firestore o'qishlari** bepul (Spark) limitга yaqin — dept-scoped so'rovlar,
  60s kesh, TV uchun `factory_updates` signal-hujjat bilan optimallashtirilган.
- **Firestore qoidalari** Firebase Console'da (kodda emas), rol-asosli, muddatsiz.
- **Buyurtмadan oshishni nazorat qilish** (real-vaqt ogohlantirish + saqlashni to'sish)
  — bir marta qo'shilганда smena kiritish sahifasини crash qildi, hozir vaqtincha
  olib tashlangan (git commit `6837e8db` da implementatsiya bor, qayta ko'riladi).

---

# 9. MANBA KODLAR (to'liq)


## `ishlab-chiqarish/package.json`

`````json
{
  "name": "ishlab-chiqarish",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@sparticuz/chromium": "^133.0.0",
    "date-fns": "^4.1.0",
    "firebase": "^12.14.0",
    "firebase-admin": "^12.7.0",
    "html2pdf.js": "^0.10.2",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.4",
    "lucide-react": "^0.468.0",
    "puppeteer-core": "^24.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "recharts": "^3.8.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "vite": "^6.0.3"
  }
}
`````


## `ishlab-chiqarish/src/main.jsx`

`````jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`````


## `ishlab-chiqarish/src/App.jsx`

`````jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DepartmentsProvider } from './contexts/DepartmentsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Operations from './pages/Operations'
import Employees from './pages/Employees'
import DepartmentWork from './pages/DepartmentWork'
import Reports from './pages/Reports'
import Members from './pages/Members'
import Departments from './pages/Departments'
import Attendance from './pages/Attendance'
import Shifts from './pages/Shifts'
import TVDisplay from './pages/TVDisplay'
import MonthlyReport from './pages/MonthlyReport'
import EmployeeCard from './pages/EmployeeCard'
import Settings from './pages/Settings'
import Pipeline from './pages/Pipeline'
import Orders from './pages/Orders'
import { useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/tv/:deptId" element={<TVDisplay />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employee/:empId" element={<EmployeeCard />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/department/:deptId" element={<DepartmentWork />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/monthly" element={<MonthlyReport />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/members" element={<Members />} />
                <Route path="/shifts" element={<Shifts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DepartmentsProvider>
          <AppRoutes />
        </DepartmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
`````


## `ishlab-chiqarish/src/firebase/config.js`

`````js
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
`````


## `ishlab-chiqarish/src/contexts/AuthContext.jsx`

`````jsx
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
`````


## `ishlab-chiqarish/src/contexts/DepartmentsContext.jsx`

`````jsx
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

  const updateDept = (id, fields) =>
    updateDoc(doc(db, 'factory_departments', id),
      typeof fields === 'string' ? { name: fields.trim() } : fields)

  const deleteDept = (id) =>
    deleteDoc(doc(db, 'factory_departments', id))

  return (
    <DepartmentsContext.Provider value={{ departments, loading, getDeptName, addDept, updateDept, deleteDept }}>
      {children}
    </DepartmentsContext.Provider>
  )
}

export const useDepartments = () => useContext(DepartmentsContext)
`````


## `ishlab-chiqarish/src/components/Layout.jsx`

`````jsx
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentsContext'
import {
  LayoutDashboard, Settings, Cog, Users, ClipboardList, FileText,
  Menu, X, ChevronDown, ChevronRight, Building2,
  CalendarCheck, AlarmClock, BarChart2, Activity, Package,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/attendance', label: 'Davomat', icon: CalendarCheck },
  { to: '/pipeline', label: 'Zanjir tahlili', icon: Activity },
  { to: '/orders', label: 'Buyurtmalar', icon: Package },
  { to: '/operations', label: 'Operatsiyalar', icon: Settings },
  { to: '/employees', label: 'Xodimlar', icon: Users },
  { to: '/reports', label: 'Hisobotlar', icon: FileText },
  { to: '/monthly', label: 'Oylik hisobot', icon: BarChart2 },
  { to: '/shifts', label: 'Smena jadvali', icon: AlarmClock, adminOnly: true },
  { to: '/members', label: "A'zolar", icon: ClipboardList, adminOnly: true },
  { to: '/settings', label: 'Sozlamalar', icon: Cog },
]

export default function Layout({ children }) {
  const { userDoc, can } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(true)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <div className="text-2xl font-black tracking-wide leading-none">
          <span className="text-amber-500">KAFT</span><span className="text-white">IMDA</span>
        </div>
        <div className="h-0.5 bg-amber-500 rounded-full mt-1.5 w-full" />
        <div className="text-xs text-blue-300 mt-1.5 tracking-wide">Biznesingiz kaftingizda</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !can.manageMembers) return null
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 mx-2 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                active
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Departments */}
        <button
          onClick={() => setDeptOpen(o => !o)}
          className="w-[calc(100%-16px)] flex items-center gap-3 px-4 mx-2 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all mt-1"
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Bo'limlar</span>
          {deptOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {deptOpen && can.manageMembers && (
          <Link
            to="/departments"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 pl-11 pr-4 mx-2 py-2 rounded-lg text-xs transition-all w-[calc(100%-16px)] ${
              location.pathname === '/departments'
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200 italic'
            }`}
          >
            + Boshqarish
          </Link>
        )}
        {deptOpen && visibleDepts.map(dept => {
          const active = location.pathname === `/department/${dept.id}`
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 pl-11 pr-4 mx-2 py-2 rounded-lg text-xs transition-all w-[calc(100%-16px)] ${
                active
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {dept.name}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
            {userDoc?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{userDoc?.name}</div>
            <div className="text-slate-400 text-xs">{userDoc?.role}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-slate-900 flex-col flex-shrink-0 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile/tablet sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-900 flex flex-col z-50 shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile/tablet top bar */}
        <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-base tracking-wide shrink-0">
              <span className="text-amber-500">KAFT</span><span className="text-white">IMDA</span>
            </span>
            {(() => {
              const p = location.pathname
              let title = ''
              if (p === '/attendance') title = 'Davomat'
              else if (p === '/operations') title = 'Operatsiyalar'
              else if (p === '/employees') title = 'Xodimlar'
              else if (p === '/reports') title = 'Hisobotlar'
              else if (p === '/monthly') title = 'Oylik hisobot'
              else if (p === '/shifts') title = 'Smena jadvali'
              else if (p === '/members') title = "A'zolar"
              else if (p === '/departments') title = "Bo'limlar"
              else if (p.startsWith('/department/')) {
                const dept = departments.find(d => d.id === p.split('/')[2])
                title = dept?.name || "Bo'lim"
              }
              if (!title) return null
              return (
                <>
                  <span className="text-slate-600 text-sm">·</span>
                  <span className="text-sm text-slate-400 truncate">{title}</span>
                </>
              )
            })()}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-lg">
          {[
            { to: '/', label: 'Bosh', icon: LayoutDashboard },
            { to: '/attendance', label: 'Davomat', icon: CalendarCheck },
            { to: '/reports', label: 'Hisobot', icon: FileText },
            { to: '/monthly', label: 'Oylik', icon: BarChart2 },
          ].map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
          <button
            onClick={() => {
              if (visibleDepts.length === 1) {
                navigate(`/department/${visibleDepts[0].id}`)
              } else {
                setSidebarOpen(true)
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
              location.pathname.startsWith('/department/') ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Bo'limlar
          </button>
        </nav>
      </div>
    </div>
  )
}
`````


## `ishlab-chiqarish/src/components/ProtectedRoute.jsx`

`````jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Yuklanmoqda...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}
`````


## `ishlab-chiqarish/src/data/departments.js`

`````js
export const DEPARTMENTS = [
  { id: 'bichuv', name: "Bichuv bo'limi" },
  { id: 'kamzul', name: "Kamzul bo'limi" },
  { id: 'shim', name: "Shim bo'limi" },
  { id: 'tana', name: "Tana bo'limi" },
  { id: 'astar', name: "Astar bo'limi" },
  { id: 'montaj', name: "Montaj bo'limi" },
  { id: 'pardoz', name: "Pardoz dazmol bo'limi" },
  { id: 'qadoqlash', name: "Qadoqlash bo'limi" },
]

export const getDeptName = (id) => DEPARTMENTS.find(d => d.id === id)?.name || id
`````


## `ishlab-chiqarish/src/utils/orderProgress.js`

`````js
// Buyurtma progressini zanjir bo'ylab hisoblaydi.
//
// Kirishlar:
//   order        — { id, name, quantity, departmentId }
//   entries      — shu buyurtmaga teglangan ish yozuvlari (orderId == order.id)
//   opById       — { [opId]: { isFinal, isFirst, departmentId } }
//   departments  — [{ id, name, chainInput }]   chainInput = { mode:'order'|'from', sources:[], rule:'mirror'|'min'|'sum' }
//
// Qaytaradi:
//   { depts: [{ id, name, kirim, chiqim, boshlangich, qoldiq, rule, bottleneck }],
//     endpointId, done, doneQty, orderQty, percent }

// Tugash prognozi: buyurtma yaratilganidan beri o'rtacha tezlik bo'yicha taxminiy sana.
export function forecastOrder(order, doneQty) {
  const qty = Number(order.quantity || 0)
  const remaining = Math.max(0, qty - doneQty)
  if (qty > 0 && remaining === 0) return { done: true }
  const created = order.createdAt?.toMillis?.()
    ? order.createdAt.toMillis()
    : (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null)
  if (!created || doneQty <= 0) return null
  const daysElapsed = Math.max(0.5, (Date.now() - created) / 86400000)
  const rate = doneQty / daysElapsed // dona/kun
  if (rate <= 0) return null
  const daysLeft = Math.ceil(remaining / rate)
  const date = new Date(Date.now() + daysLeft * 86400000).toISOString().slice(0, 10)
  return { daysLeft, date, rate: Math.round(rate) }
}

// Operatsiyaning buyurtmasi: yozuv ichidagi op.orderId (yangi model),
// bo'lmasa (eski yozuv) butun yozuvning entry.orderId'si.
export function opOrderOf(entry, opVal) {
  return opVal && opVal.orderId !== undefined ? opVal.orderId : (entry.orderId ?? null)
}

// Bitta operatsiya bir nechta buyurtmага bo'linishi mumkin (xodim "+" bilan qo'shsa).
// allocations bo'lsa — o'shани, bo'lmasa butun operatsiyани bitta ulush deb qaytaradi.
export function allocationsOf(entry, opVal) {
  if (opVal && Array.isArray(opVal.allocations) && opVal.allocations.length) {
    return opVal.allocations.map(a => ({ quantity: Number(a.quantity || 0), orderId: a.orderId ?? null }))
  }
  return [{ quantity: Number(opVal?.quantity || 0), orderId: opOrderOf(entry, opVal) }]
}

// Bo'limning zanjir guruhi (chainInput.sources bog'lanishlari bo'ylab bog'langan bo'limlar).
function chainGroup(startId, departments) {
  const adj = {}
  const link = (a, b) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a) }
  departments.forEach(d => (d.chainInput?.sources || []).forEach(s => link(d.id, s)))
  const seen = new Set([startId])
  const stack = [startId]
  while (stack.length) {
    const cur = stack.pop()
    ;(adj[cur] || []).forEach(n => { if (!seen.has(n)) { seen.add(n); stack.push(n) } })
  }
  return seen
}

export function computeOrderChain(order, entries, opById, departments, opts = {}) {
  const orderQty = Number(order.quantity || 0)
  const targetId = order.id
  const deptById = Object.fromEntries(departments.map(d => [d.id, d]))
  // Har operatsiya alohida buyurtmaga teglanadi — shuning uchun barcha yozuvlar
  // uzatiladi, ichida esa faqat shu buyurtmaga tegishli operatsiyalar hisoblanadi.
  const autoEntries = opts.autoEntries || entries
  const allOrders = opts.allOrders || []

  // Har bo'lim uchun chiqim (yakuniy op) va boshlang'ich (kirim op) miqdori
  const chiqim = {}       // yakuniy operatsiya yig'indisi
  const boshlangich = {}  // boshlang'ich operatsiya yig'indisi
  const opQtyByDept = {}  // { deptId: { opId: yig'indi } } — operatsiya tiqilishi uchun
  const appeared = new Set()

  entries.forEach(e => {
    const dId = e.departmentId
    Object.entries(e.operations || {}).forEach(([opId, val]) => {
      const op = opById[opId]
      if (!op) return
      allocationsOf(e, val).forEach(a => {
        if (a.orderId !== targetId) return // faqat shu buyurtmaga teglangan ulush
        appeared.add(dId)
        const qty = a.quantity
        if (op.isFinal) chiqim[dId] = (chiqim[dId] || 0) + qty
        if (op.isFirst) boshlangich[dId] = (boshlangich[dId] || 0) + qty
        if (!opQtyByDept[dId]) opQtyByDept[dId] = {}
        opQtyByDept[dId][opId] = (opQtyByDept[dId][opId] || 0) + qty
      })
    })
  })

  // Bo'lim ichida tiqilgan operatsiya = eng kam bajarilgan (drop bo'lgan) operatsiya
  const opBottleneckOf = (dId) => {
    const m = opQtyByDept[dId]
    if (!m) return null
    const list = Object.entries(m).map(([opId, qty]) => ({
      name: opById[opId]?.name || opId,
      order: opById[opId]?.order ?? Infinity,
      qty,
    }))
    if (list.length < 2) return null
    const max = Math.max(...list.map(o => o.qty))
    const min = Math.min(...list.map(o => o.qty))
    if (min >= max) return null // barcha operatsiya teng — tiqilish yo'q
    const bn = list.filter(o => o.qty === min).sort((a, b) => a.order - b.order)[0]
    return { name: bn.name, qty: bn.qty }
  }

  // FIFO avto: 'auto' teglangan chiqimni bo'lim buyurtmalari bo'ylab navbat bilan taqsimlash
  // Bu buyurtmaga tegishli ulush shu buyurtma egasi bo'limi chiqimiga qo'shiladi.
  const autoPool = {} // { deptId: yakuniy chiqim yig'indisi (auto) }
  autoEntries.forEach(e => {
    Object.entries(e.operations || {}).forEach(([opId, val]) => {
      const op = opById[opId]
      if (!op?.isFinal) return
      allocationsOf(e, val).forEach(a => {
        if (a.orderId !== 'auto') return // faqat FIFO-avto teglangan ulush
        autoPool[e.departmentId] = (autoPool[e.departmentId] || 0) + a.quantity
      })
    })
  })
  // Har bir bo'limning 'auto' yakuniy chiqimini o'sha bo'lim zanjir guruhiga
  // tegishli buyurtmalar bo'yicha navbat (priority) bilan taqsimlaymiz. Shu bilan
  // mustaqil bo'lim ham, zanjir yakuni (masalan Montaj) ham FIFO'da to'g'ri ishlaydi.
  Object.keys(autoPool).forEach(d => {
    if (!(autoPool[d] > 0)) return
    const comp = chainGroup(d, departments)
    const groupOrders = allOrders
      .filter(o => o.isActive !== false && comp.has(o.departmentId))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    let pool = autoPool[d]
    for (const o of groupOrders) {
      const share = Math.min(pool, Number(o.quantity || 0))
      pool -= share
      if (o.id === order.id) { chiqim[d] = (chiqim[d] || 0) + share; appeared.add(d); break }
      if (pool <= 0) break
    }
  })

  // Ishtirok etgan bo'limlar: yozuvi borlar + ularga bog'langan 'from' bo'limlar (masalan Montaj)
  const involved = new Set(appeared)
  departments.forEach(d => {
    const ci = d.chainInput
    if (ci?.mode === 'from' && (ci.sources || []).some(s => appeared.has(s))) involved.add(d.id)
  })
  // Buyurtma egasi bo'limi ham
  if (order.departmentId) involved.add(order.departmentId)

  const kirimOf = (dId, seen = new Set()) => {
    if (seen.has(dId)) return orderQty // xavfsizlik: siklni to'xtatish
    seen.add(dId)
    const ci = deptById[dId]?.chainInput
    if (!ci || ci.mode !== 'from') return orderQty // mustaqil = buyurtma miqdori
    const sources = (ci.sources || []).filter(s => s !== dId)
    if (sources.length === 0) return orderQty
    const vals = sources.map(s => chiqim[s] || 0)
    if (ci.rule === 'sum')    return vals.reduce((a, b) => a + b, 0)
    if (ci.rule === 'mirror') return kirimOf(sources[0], seen)
    // 'min' (standart)
    return Math.min(...vals)
  }

  // Bo'limning BARCHA operatsiyalari (Operatsiyalar sahifasidagi tartibда) + shu buyurtмага
  // teglangan miqdori (yo'q bo'lsa 0). Hisobotда buyurtma × operatsiya jadvали uchun.
  const opsOfDept = (dId) => Object.keys(opById)
    .filter(opId => opById[opId].departmentId === dId)
    .map(opId => ({
      name: opById[opId].name || opId,
      order: opById[opId].order ?? Infinity,
      qty: (opQtyByDept[dId] && opQtyByDept[dId][opId]) || 0,
      isFinal: !!opById[opId].isFinal,
    }))
    .sort((a, b) => a.order - b.order)

  const depts = [...involved].map(dId => {
    const d = deptById[dId] || { id: dId, name: dId }
    const ci = d.chainInput
    const k = kirimOf(dId)
    const c = chiqim[dId] || 0
    let bottleneck = null
    if (ci?.mode === 'from' && ci.rule === 'min') {
      const sources = (ci.sources || []).filter(s => s !== dId)
      let minV = Infinity, minId = null
      sources.forEach(s => { const v = chiqim[s] || 0; if (v < minV) { minV = v; minId = s } })
      if (minId) bottleneck = { id: minId, name: deptById[minId]?.name || minId, qty: minV }
    }
    return {
      id: dId,
      name: d.name || dId,
      rule: ci?.mode === 'from' ? (ci.rule || 'min') : 'order',
      kirim: k,
      chiqim: c,
      boshlangich: boshlangich[dId] || 0,
      qoldiq: Math.max(0, k - c),
      bottleneck,               // qaysi manba BO'LIM eng kam (min-bo'lim uchun)
      opBottleneck: opBottleneckOf(dId), // qaysi OPERATSIYA orqada (bo'lim ichида)
      opList: opsOfDept(dId),   // bo'limning barcha operatsiyalari + shu buyurtma miqdori
    }
  })

  // Endpoint (tayyor mahsulot bo'limi): 'from' bo'lim (masalan Montaj), bo'lmasa buyurtma egasi
  const fromDept = depts.find(d => d.rule !== 'order')
  const endpointId = fromDept ? fromDept.id : (order.departmentId || depts[0]?.id)
  const doneQty = chiqim[endpointId] || 0
  const percent = orderQty > 0 ? Math.round((doneQty / orderQty) * 100) : 0
  const done = orderQty > 0 && doneQty >= orderQty

  // Ko'rsatish tartibi: mustaqil bo'limlar avval, 'from' (yig'uvchi) oxirida
  depts.sort((a, b) => (a.rule === 'order' ? 0 : 1) - (b.rule === 'order' ? 0 : 1))

  return { depts, endpointId, done, doneQty, orderQty, percent }
}
`````


## `ishlab-chiqarish/src/utils/orderReport.js`

`````js
import { collection, getDocs, query, where } from 'firebase/firestore'
import { computeOrderChain, forecastOrder } from './orderProgress'

// Hisobotda uchragan buyurtmalar bo'yicha xulosa (tayyor/jami/%, tiqilish, prognoz)
// va buyurtma nomlari xaritasini qaytaradi. PDF/Telegram hisoboti uchun.
export async function fetchOrderSummary(db, orderIds, targetDeptId = null) {
  const ids = [...new Set((orderIds || []).filter(id => id && id !== 'auto'))]
  if (ids.length === 0) return { summary: [], orderById: {} }

  const [orderSnap, opSnap, deptSnap] = await Promise.all([
    getDocs(collection(db, 'factory_orders')),
    getDocs(collection(db, 'factory_operations')),
    getDocs(collection(db, 'factory_departments')),
  ])
  const allOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const orderById = Object.fromEntries(allOrders.map(o => [o.id, o]))
  const opById = {}
  opSnap.forEach(d => { const o = d.data(); opById[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })
  const departments = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Ham eski (entry.orderId), ham yangi (operatsiya ichidagi orderId → entry.orderIds massivi)
  // yozuvlarni yig'amiz. Har op alohida teglanadi, shuning uchun ikkala so'rov birlashtiriladi.
  const qids = [...ids, 'auto']
  const byDoc = new Map()
  for (let i = 0; i < qids.length; i += 30) {
    const chunk = qids.slice(i, i + 30)
    const [legacy, tagged] = await Promise.all([
      getDocs(query(collection(db, 'factory_work_entries'), where('orderId', 'in', chunk))),
      getDocs(query(collection(db, 'factory_work_entries'), where('orderIds', 'array-contains-any', chunk))),
    ])
    legacy.forEach(d => byDoc.set(d.id, d.data()))
    tagged.forEach(d => byDoc.set(d.id, d.data()))
  }
  const entries = [...byDoc.values()]

  const summary = ids.map(id => {
    const o = orderById[id]
    if (!o) return null
    const chain = computeOrderChain(o, entries, opById, departments, { allOrders })
    // Hisobot bo'limi: berilган bo'lim (masalan Montaj), bo'lmasa — yakuniy bo'lim
    const reportDept = targetDeptId
      ? chain.depts.find(d => d.id === targetDeptId)
      : chain.depts.find(d => d.id === chain.endpointId)
    // Tiqilish HAR BIR bo'limga o'zinikini ko'rsatadi: bo'lim berilган bo'lsa o'shaniki,
    // aks holda (umumiy hisobot) zanjirdagi birinchi tiqilgan bo'lim.
    const bnDept = targetDeptId ? reportDept : chain.depts.find(d => d.bottleneck)
    const opbnDept = targetDeptId ? reportDept : chain.depts.find(d => d.opBottleneck)
    // "Tayyor": bo'lim hisoboti bo'lsa -> shu bo'lim yakuniy operatsiyasi (chiqim);
    // umumiy hisoboti bo'lsa -> buyurtma zanjir yakuni.
    const doneQ = targetDeptId ? (reportDept?.chiqim ?? 0) : chain.doneQty
    const pct = chain.orderQty > 0 ? Math.round((doneQ / chain.orderQty) * 100) : 0
    const isDone = chain.orderQty > 0 && doneQ >= chain.orderQty
    const f = forecastOrder(o, doneQ)
    return {
      name: o.name,
      doneQty: doneQ,
      orderQty: chain.orderQty,
      percent: pct,
      done: isDone,
      bottleneck: bnDept?.bottleneck ? `${bnDept.bottleneck.name} (${bnDept.bottleneck.qty})` : null,
      opBottleneck: opbnDept?.opBottleneck ? `${opbnDept.name}: ${opbnDept.opBottleneck.name} (${opbnDept.opBottleneck.qty})` : null,
      forecast: f && !f.done ? `${f.date} (${f.daysLeft} kun)` : null,
      ops: (reportDept?.opList || []).map(op => ({ name: op.name, qty: op.qty, isFinal: op.isFinal })),
    }
  }).filter(Boolean)

  return { summary, orderById }
}
`````


## `ishlab-chiqarish/src/utils/pdf.js`

`````js
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function qtyStyle(qty, exp) {
  if (qty > exp)   return { bg: '#dcfce7', color: '#15803d' }
  if (qty === exp) return { bg: '#fef9c3', color: '#854d0e' }
  return               { bg: '#fee2e2', color: '#991b1b' }
}

export function buildWorkPDFHtml(rows, filters, deptName, showDept = true, autoPrint = true, dailyTayyor = null, orderSummary = null) {
  const totalDone   = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp    = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const totalTayyor = rows.filter(r => r.isFinal).reduce((s, r) => s + Number(r.quantity || 0), 0)
  const eff         = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount    = new Set(rows.map(r => r.empName)).size
  const effColor    = eff >= 100 ? '#15803d' : eff >= 80 ? '#854d0e' : '#991b1b'
  const effBg       = eff >= 100 ? '#f0fdf4' : eff >= 80 ? '#fefce8' : '#fef2f2'

  const empStats = new Map()
  rows.forEach(r => {
    const s = empStats.get(r.empName) ?? { done: 0, exp: 0, deptName: r.deptName }
    s.done += Number(r.quantity || 0)
    s.exp  += Number(r.expected  || 0)
    empStats.set(r.empName, s)
  })
  const empRank = new Map(
    [...empStats.entries()]
      .sort(([nameA, a], [nameB, b]) => {
        const ea = a.exp > 0 ? a.done / a.exp : 0
        const eb = b.exp > 0 ? b.done / b.exp : 0
        return eb - ea || nameA.localeCompare(nameB)
      })
      .map(([name], i) => [name, i])
  )
  function empEff(name) {
    const s = empStats.get(name)
    return s && s.exp > 0 ? Math.round((s.done / s.exp) * 100) : 0
  }

  const dates = [...new Set(rows.map(r => r.date))].sort()

  const sections = dates.map(date => {
    const dr = rows.filter(r => r.date === date)
    const slots = [...new Set(dr.map(r => `${r.startTime}–${r.endTime}`))].sort()

    const groupMap = new Map()
    dr.forEach(r => {
      const key = `${r.empName}||${r.deptName}||${r.opName}||${r.norm}`
      if (!groupMap.has(key)) {
        groupMap.set(key, { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, isCustomNorm: !!r.isCustomNorm, orderName: r.orderName || '', bySlot: {} })
      }
      // Bir operatsiya bir necha buyurtmага bo'lingan bo'lsa — ulushlar qo'shiladi (o'zaro yozilmaydi)
      const slotKey = `${r.startTime}–${r.endTime}`
      const cell = groupMap.get(key).bySlot[slotKey] || { qty: 0, exp: 0, note: '' }
      cell.qty += Number(r.quantity || 0)
      cell.exp += Number(r.expected || 0)
      if (r.note) cell.note = cell.note ? `${cell.note}; ${r.note}` : r.note
      groupMap.get(key).bySlot[slotKey] = cell
    })

    const groups = [...groupMap.values()].sort((a, b) =>
      (empRank.get(a.empName) ?? 999) - (empRank.get(b.empName) ?? 999) ||
      a.opName.localeCompare(b.opName)
    )

    return { date, slots, groups }
  })

  const sectionsHtml = sections.map(({ date, slots, groups }) => {
    const slotHeaders = slots
      .map(s => `<th class="slot-th">${esc(s)}</th>`)
      .join('')

    let prevEmp = null
    const tableRows = groups.map((g, i) => {
      const isFirst = g.empName !== prevEmp
      prevEmp = g.empName

      const totDone = slots.reduce((s, sl) => s + (g.bySlot[sl]?.qty ?? 0), 0)
      const totExp  = slots.reduce((s, sl) => s + (g.bySlot[sl]?.exp ?? 0), 0)
      const { bg: tBg, color: tCol } = qtyStyle(totDone, totExp)
      const pct = totExp > 0 ? Math.round((totDone / totExp) * 100) : null

      const slotCells = slots.map(sl => {
        const e = g.bySlot[sl]
        if (!e) return `<td class="slot-td empty">—</td>`
        const { bg, color } = qtyStyle(e.qty, e.exp)
        return `<td class="slot-td">
          <div class="qty-badge" style="background:${bg}">
            <div class="qty-num" style="color:${color}">${e.qty}</div>
            <div class="qty-exp">${Math.round(e.exp)}</div>
          </div>
          ${e.note ? `<div class="slot-note">${esc(e.note)}</div>` : ''}
        </td>`
      }).join('')

      return `<tr class="${i % 2 === 1 ? 'row-alt' : ''}">
        <td class="td-num">${i + 1}</td>
        <td class="td-name">${isFirst ? (() => {
          const rank = (empRank.get(g.empName) ?? 0) + 1
          const e = empEff(g.empName)
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
          const ec = e >= 100 ? '#15803d' : e >= 80 ? '#854d0e' : '#991b1b'
          const eb = e >= 100 ? '#f0fdf4' : e >= 80 ? '#fefce8' : '#fef2f2'
          return `<span style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap">
            <span style="font-size:11px">${medal}</span>
            <strong>${esc(g.empName)}</strong>
          </span>`
        })() : ''}</td>
        ${showDept ? `<td class="td-dept">${isFirst ? `<span class="dept-badge">${esc(g.deptName)}</span>` : ''}</td>` : ''}
        <td class="td-op">${esc(g.opName)}${g.isCustomNorm ? ` <span class="custom-badge">shaxsiy${pct !== null ? ' ' + pct + '%' : ''}</span>` : ''}${g.orderName ? ` <span class="order-badge">📦 ${esc(g.orderName)}</span>` : ''}</td>
        <td class="td-norm">${esc(g.norm)} dona/soat</td>
        ${slotCells}
        <td class="slot-td">
          <div class="qty-badge" style="background:${tBg}">
            <div class="qty-num" style="color:${tCol}">${totDone}</div>
            <div class="qty-exp">${totExp.toFixed(0)}</div>
          </div>
        </td>
      </tr>`
    }).join('')

    return `
      <div class="date-section">
        <div class="date-hdr">${fmtDate(date)}</div>
        <table>
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th>Xodim</th>
              ${showDept ? `<th>Bo'lim</th>` : ''}
              <th>Operatsiya</th>
              <th>Norma</th>
              ${slotHeaders}
              <th class="slot-th">Jami</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`
  }).join('')

  const printed = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Hisobot – KAFTIMDA</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#1e293b; }

  .hdr { background:#0f1c3a; color:#fff; padding:13px 18px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #D97706; margin-bottom:7px; }
  .hdr-l .brand-wrap { display:inline-block; }
  .hdr-l .brand { font-size:22px; font-weight:900; letter-spacing:1px; line-height:1.1; }
  .hdr-l .brand .kaft { color:#D97706; }
  .hdr-l .brand .imda { color:#ffffff; }
  .hdr-l .amber   { width:100%; height:2.5px; background:#D97706; border-radius:1px; margin-top:5px; }
  .hdr-l .tagline { font-size:9px; color:#93c5fd; margin-top:3px; letter-spacing:0.3px; }
  .hdr-l .sub     { font-size:10px; color:#93c5fd; margin-top:5px; line-height:1.7; font-weight:500; }
  .hdr-r { display:flex; align-items:center; gap:22px; }
  .hdr-r .contacts { text-align:right; }
  .hdr-r .detail { font-size:9.5px; color:#94a3b8; margin-top:3px; display:flex; align-items:center; justify-content:flex-end; gap:4px; }
  .hdr-r .detail:first-child { margin-top:0; }

  .stats { display:flex; gap:6px; margin-bottom:8px; }
  .card  { flex:1; border-radius:6px; padding:6px 10px;
           border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:14px; font-weight:700; }
  .card-lbl { font-size:8px; color:#64748b; margin-top:1px; }

  .date-section { margin-bottom:10px; }
  .date-hdr { background:#1e40af; color:#fff; font-size:10px; font-weight:700;
              padding:4px 8px; border-radius:4px 4px 0 0; letter-spacing:.3px; }

  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead { display:table-header-group; }
  thead tr { background:#334155; color:#fff; }
  thead th { padding:5px 6px; text-align:left; font-weight:600;
             font-size:9px; white-space:nowrap; }
  .th-num  { width:22px; text-align:center; }
  .slot-th { text-align:center; }
  .row-alt { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #f1f5f9; page-break-inside:avoid; }
  tbody td { padding:5px 6px; vertical-align:middle; }
  .td-num  { color:#94a3b8; text-align:center; width:22px; }
  .td-name { font-weight:700; white-space:nowrap; font-size:11px; }
  .td-dept { white-space:nowrap; }
  .td-op   { font-size:11px; }
  .td-norm { color:#64748b; white-space:nowrap; font-size:9.5px; }
  .dept-badge { background:#eff6ff; color:#1d4ed8; padding:2px 7px;
                border-radius:10px; font-size:9.5px; white-space:nowrap; }
  .custom-badge { background:#eef2ff; color:#4338ca; padding:1px 6px;
                  border-radius:8px; font-size:8.5px; font-weight:700; white-space:nowrap; }
  .order-badge { background:#fef3c7; color:#92400e; padding:1px 6px;
                 border-radius:8px; font-size:8.5px; font-weight:700; white-space:nowrap; }
  .slot-td { text-align:center; padding:3px 4px; }
  .slot-td.empty { color:#94a3b8; font-size:11px; }
  .qty-badge { border-radius:5px; padding:3px 6px; display:inline-block; min-width:36px; }
  .qty-num { font-weight:700; font-size:12px; line-height:1.3; }
  .qty-exp { font-size:8.5px; color:#64748b; line-height:1.3; }
  .slot-note { font-size:8px; color:#475569; font-style:italic; margin-top:2px; max-width:80px; word-wrap:break-word; }

  .order-box { margin-top:10px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
  .order-title { background:#1e293b; color:#fff; font-size:10px; font-weight:700; padding:5px 10px; }
  .order-table { width:100%; border-collapse:collapse; font-size:10px; }
  .order-table th { background:#f1f5f9; color:#475569; font-size:9px; font-weight:700; padding:4px 8px; text-align:left; }
  .order-table td { padding:4px 8px; border-top:1px solid #f1f5f9; }
  .order-table .c { text-align:center; }

  .order-ops { padding:6px 10px 8px; border-top:1px solid #e2e8f0; }
  .order-ops-item { margin-top:6px; }
  .order-ops-item:first-child { margin-top:0; }
  .order-ops-hdr { font-size:9.5px; font-weight:700; color:#1e293b; margin-bottom:2px; }
  .order-ops-grid { display:flex; flex-wrap:wrap; gap:4px 6px; }
  .op-chip { font-size:9px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px;
             padding:1px 6px; color:#475569; white-space:nowrap; }
  .op-chip.final { background:#f0fdf4; border-color:#bbf7d0; color:#15803d; }
  .op-chip.zero { color:#94a3b8; }
  .op-chip b { color:#1e293b; }

  .legend { display:flex; align-items:center; gap:12px; margin-top:8px;
            padding-top:6px; border-top:1px solid #e2e8f0; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:9px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .legend-note { margin-left:auto; font-size:8px; color:#94a3b8; }

  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:5px; border-top:1px solid #e2e8f0;
            font-size:8.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .date-hdr { page-break-after:avoid; }
    tbody tr  { page-break-inside:avoid; }
  }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-l">
    <div class="brand-wrap">
      <div class="brand"><span class="kaft">KAFT</span><span class="imda">IMDA</span></div>
      <div class="amber"></div>
    </div>
    <div class="tagline">Biznesingiz kaftingizda</div>
    <div class="sub">${esc(deptName)} &nbsp;·&nbsp; ${esc(filters)}<br>Chiqarilgan: ${printed}</div>
  </div>
  <div class="hdr-r">
    <div class="contacts">
      <div class="detail">kaftimda@gmail.com</div>
      <div class="detail">
        <svg viewBox="0 0 16 16" width="11" height="11" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.3 6.9c1 2 2.8 3.7 4.8 4.8l1.6-1.6c.2-.2.5-.3.7-.1.8.3 1.7.5 2.6.5.4 0 .7.3.7.7V14c0 .4-.3.7-.7.7C6 14.7 1.3 10 1.3 4.3c0-.4.3-.7.7-.7H5c.4 0 .7.3.7.7 0 1 .2 1.9.5 2.7.1.3 0 .6-.2.7L3.3 6.9z" fill="#94a3b8"/>
        </svg>
        +998 91 760 66 66
      </div>
      <div class="detail">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="#94a3b8"/>
        </svg>
        @KAFTIMDA
      </div>
    </div>
  </div>
</div>

<div class="stats">
  ${dailyTayyor !== null ? `<div class="card" style="background:#fef3c7;border-color:#fde68a">
    <div class="card-val" style="color:#92400e">${dailyTayyor}</div>
    <div class="card-lbl">Bugungi jami tayyor</div>
  </div>` : ''}
  <div class="card" style="background:#fffbeb">
    <div class="card-val" style="color:#b45309">${totalTayyor}</div>
    <div class="card-lbl">Bu smena tayyor</div>
  </div>
  <div class="card" style="background:#eff6ff">
    <div class="card-val" style="color:#1e40af">${empCount}</div>
    <div class="card-lbl">Xodimlar</div>
  </div>
  <div class="card" style="background:#f0fdf4">
    <div class="card-val" style="color:#15803d">${totalDone}</div>
    <div class="card-lbl">Bajarilgan operatsiyalar</div>
  </div>
  <div class="card" style="background:#fefce8">
    <div class="card-val" style="color:#854d0e">${totalExp.toFixed(0)}</div>
    <div class="card-lbl">Kutilgan operatsiyalar</div>
  </div>
</div>

${sectionsHtml}

${(orderSummary && orderSummary.length) ? `
<div class="order-box">
  <div class="order-title">📦 Buyurtmalar holati</div>
  <table class="order-table">
    <thead><tr>
      <th>Buyurtma</th><th class="c">Tayyor</th><th class="c">Jami</th><th class="c">%</th>
      <th class="c">Holat</th><th>Tiqilish / Prognoz</th>
    </tr></thead>
    <tbody>
      ${orderSummary.map(o => {
        const col = o.done ? '#15803d' : o.percent >= 80 ? '#854d0e' : '#991b1b'
        const extra = []
        if (o.bottleneck && !o.done) extra.push(`⚠️ Bo'lim: <strong>${esc(o.bottleneck)}</strong>`)
        if (o.opBottleneck && !o.done) extra.push(`⚠️ Operatsiya: <strong>${esc(o.opBottleneck)}</strong>`)
        if (o.forecast && !o.done) extra.push(`📈 ${esc(o.forecast)}`)
        return `<tr>
          <td><strong>${esc(o.name)}</strong></td>
          <td class="c">${o.doneQty.toLocaleString()}</td>
          <td class="c">${o.orderQty.toLocaleString()}</td>
          <td class="c" style="color:${col};font-weight:700">${o.percent}%</td>
          <td class="c">${o.done ? '✅ Bajarildi' : '🔄 Jarayonda'}</td>
          <td style="font-size:9px;color:#64748b">${extra.join(' · ') || '—'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  ${orderSummary.some(o => (o.ops || []).length) ? `
  <div class="order-ops">
    ${orderSummary.filter(o => (o.ops || []).length).map(o => `
      <div class="order-ops-item">
        <div class="order-ops-hdr">📦 ${esc(o.name)} — ${o.doneQty.toLocaleString()}/${o.orderQty.toLocaleString()} (${o.percent}%)</div>
        <div class="order-ops-grid">
          ${o.ops.map(op => `<span class="op-chip${op.isFinal ? ' final' : ''}${op.qty === 0 ? ' zero' : ''}">${esc(op.name)}: <b>${Number(op.qty).toLocaleString()}</b></span>`).join('')}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}
</div>
` : ''}

<div class="legend">
  <div class="legend-item">
    <div class="dot" style="background:#dcfce7;border:1px solid #bbf7d0"></div>Normadan yuqori
  </div>
  <div class="legend-item">
    <div class="dot" style="background:#fef9c3;border:1px solid #fef08a"></div>Normaga teng
  </div>
  <div class="legend-item">
    <div class="dot" style="background:#fee2e2;border:1px solid #fecaca"></div>Normadan past
  </div>
  <div class="legend-note">Har bir katakda: <strong>bajargan</strong> / kutilgan</div>
</div>

<div class="footer">
  <div class="brand">KAFTIMDA</div>
  <div>kaftimda@gmail.com &nbsp;·&nbsp; +998 91 760 66 66</div>
</div>

${autoPrint ? '<scr' + 'ipt>window.onload=function(){window.print()}</' + 'script>' : ''}
</body>
</html>`
}

export function exportPDF(rows, filters, deptName, showDept = true) {
  if (!rows.length) return
  const html = buildWorkPDFHtml(rows, filters, deptName, showDept, true)
  const win = window.open('', '_blank', 'width=1200,height=900')
  if (!win) {
    alert("Brauzer popup'ni blokladi. Iltimos, ruxsat bering va qaytadan bosing.")
    return
  }
  win.document.write(html)
  win.document.close()
}

export async function exportPDFBlob(rows, filters, deptName, showDept = true) {
  if (!rows.length) return null

  // Try server-side Puppeteer first — same beautiful design as the print button
  try {
    const html = buildWorkPDFHtml(rows, filters, deptName, showDept, false)
    const res = await fetch('/api/html-to-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    })
    if (res.ok) return await res.blob()
  } catch {
    // fall through to jsPDF
  }

  // Fallback: pure client-side jsPDF
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 28, 58)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setDrawColor(217, 119, 6)
  doc.setLineWidth(0.8)
  doc.line(0, 22, pageW, 22)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(217, 119, 6)
  doc.text('KAFT', 10, 11)
  doc.setTextColor(255, 255, 255)
  doc.text('IMDA', 10 + doc.getTextWidth('KAFT'), 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(147, 197, 253)
  doc.text(`${deptName}  ·  ${filters}`, 10, 17)
  doc.setTextColor(148, 163, 184)
  doc.text(`kaftimda@gmail.com  ·  +998 91 760 66 66`, pageW - 10, 11, { align: 'right' })
  const printed = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.text(`Chiqarilgan: ${printed}`, pageW - 10, 17, { align: 'right' })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDone   = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp    = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const totalTayyor = rows.filter(r => r.isFinal).reduce((s, r) => s + Number(r.quantity || 0), 0)
  const empCount    = new Set(rows.map(r => r.empName)).size
  const eff         = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0

  const stats = [
    { label: 'Tayyor mahsulot', val: totalTayyor, bg: [255, 251, 235] },
    { label: 'Xodimlar',        val: empCount,    bg: [239, 246, 255] },
    { label: 'Bajarilgan operatsiyalar', val: totalDone,   bg: [240, 253, 244] },
    { label: 'Kutilgan operatsiyalar',   val: Math.round(totalExp), bg: [254, 252, 232] },
  ]
  const cardW = (pageW - 20) / stats.length
  stats.forEach((s, i) => {
    const x = 10 + i * cardW
    doc.setFillColor(...s.bg)
    doc.roundedRect(x, 25, cardW - 2, 12, 1.5, 1.5, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(String(s.val), x + (cardW - 2) / 2, 32, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(s.label, x + (cardW - 2) / 2, 36, { align: 'center' })
  })

  // ── Tables per date ───────────────────────────────────────────────────────
  const empStats = new Map()
  rows.forEach(r => {
    const s = empStats.get(r.empName) ?? { done: 0, exp: 0 }
    s.done += Number(r.quantity || 0)
    s.exp  += Number(r.expected  || 0)
    empStats.set(r.empName, s)
  })
  const empRank = new Map(
    [...empStats.entries()]
      .sort(([, a], [, b]) => (b.exp > 0 ? b.done / b.exp : 0) - (a.exp > 0 ? a.done / a.exp : 0))
      .map(([name], i) => [name, i])
  )

  const dates = [...new Set(rows.map(r => r.date))].sort()
  let startY = 40

  for (const date of dates) {
    const dr = rows.filter(r => r.date === date)
    const slots = [...new Set(dr.map(r => `${r.startTime}–${r.endTime}`))].sort()

    const groupMap = new Map()
    dr.forEach(r => {
      const key = `${r.empName}||${r.deptName}||${r.opName}`
      if (!groupMap.has(key)) groupMap.set(key, { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, bySlot: {} })
      groupMap.get(key).bySlot[`${r.startTime}–${r.endTime}`] = { qty: Number(r.quantity), exp: Number(r.expected) }
    })

    const groups = [...groupMap.values()].sort((a, b) =>
      (empRank.get(a.empName) ?? 999) - (empRank.get(b.empName) ?? 999)
    )

    const [yyyy, mm, dd] = date.split('-')
    const dateStr = `${dd}.${mm}.${yyyy}`

    const head = [['#', 'Xodim', ...(showDept ? ["Bo'lim"] : []), 'Operatsiya', 'Norma', ...slots, 'Jami']]

    const body = groups.map((g, i) => {
      const rank = (empRank.get(g.empName) ?? 0) + 1
      const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : `#${rank} `
      const eVal = empStats.get(g.empName)
      const e = eVal && eVal.exp > 0 ? Math.round((eVal.done / eVal.exp) * 100) : 0
      const totDone = slots.reduce((s, sl) => s + (g.bySlot[sl]?.qty ?? 0), 0)
      const totExp  = slots.reduce((s, sl) => s + (g.bySlot[sl]?.exp ?? 0), 0)
      return [
        i + 1,
        `${medal}${g.empName}`,
        ...(showDept ? [g.deptName] : []),
        g.opName,
        `${g.norm} d/s`,
        ...slots.map(sl => {
          const cell = g.bySlot[sl]
          return cell ? `${cell.qty} / ${Math.round(cell.exp)}` : '—'
        }),
        `${totDone} / ${Math.round(totExp)}`,
      ]
    })

    const slotStartIdx = 4 + (showDept ? 1 : 0)

    autoTable(doc, {
      head,
      body,
      startY,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
      willDrawCell(d) {
        if (d.section !== 'body') return
        if (d.column.index < slotStartIdx) return
        if (d.cell.raw === '—') return
        const parts = String(d.cell.raw).split(' / ')
        if (parts.length !== 2) return
        const [qty, exp] = parts.map(Number)
        if (isNaN(qty) || isNaN(exp)) return
        if (qty > exp)      d.cell.styles.textColor = [21, 128, 61]
        else if (qty === exp) d.cell.styles.textColor = [133, 77, 14]
        else                  d.cell.styles.textColor = [153, 27, 27]
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.halign = 'center'
      },
      didDrawPage() {
        doc.setFillColor(15, 28, 58)
        doc.rect(0, 0, pageW, 22, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('KAFTIMDA', 10, 11)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(147, 197, 253)
        doc.text(`${deptName}  ·  ${filters}`, 10, 17)
      },
    })

    startY = doc.lastAutoTable.finalY + 8
    // Add date label before next section
    if (date !== dates[dates.length - 1]) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(30, 64, 175)
      doc.roundedRect(10, startY, 40, 6, 1, 1, 'F')
      doc.text(dateStr, 30, startY + 4, { align: 'center' })
      startY += 9
    }
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  startY = doc.lastAutoTable.finalY + 4
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const legend = [
    { color: [21, 128, 61],  label: 'Normadan yuqori' },
    { color: [133, 77, 14],  label: 'Normaga teng' },
    { color: [153, 27, 27],  label: 'Normadan past' },
  ]
  let lx = 10
  legend.forEach(l => {
    doc.setFillColor(...l.color)
    doc.rect(lx, startY, 4, 4, 'F')
    doc.setTextColor(100, 116, 139)
    doc.text(l.label, lx + 6, startY + 3)
    lx += 40
  })

  return doc.output('blob')
}

// ── Attendance PDF ────────────────────────────────────────────────────────────

const REASON_LABELS = {
  kasallik: 'Kasallik',
  tatil:    "Ta'til",
  sababsiz: 'Sababsiz',
  boshqa:   'Boshqa',
}
const REASON_STYLE = {
  kasallik: { bg: '#dbeafe', color: '#1d4ed8' },
  tatil:    { bg: '#f3e8ff', color: '#7e22ce' },
  sababsiz: { bg: '#fee2e2', color: '#991b1b' },
  boshqa:   { bg: '#f1f5f9', color: '#475569' },
}

export function buildAttendancePDFHtml(absentEmps, allEmps, absences, departments, date) {
  const totalAbsent  = absentEmps.length
  const totalPresent = allEmps.length - totalAbsent
  const printed      = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const deptGroups = departments
    .map(dept => ({ dept, emps: absentEmps.filter(e => e.departmentId === dept.id) }))
    .filter(g => g.emps.length > 0)

  let rowNum = 0
  const tableRows = deptGroups.map(({ dept, emps }) => {
    const deptRow = `<tr class="dept-group-row">
      <td colspan="4" class="td-dept-group">
        ${esc(dept.name)}
        <span class="dept-count">${emps.length} nafar</span>
      </td>
    </tr>`

    const empRows = emps.map((emp, i) => {
      rowNum++
      const abs         = absences[emp.id]
      const reasonKey   = abs?.reason || ''
      const reasonLabel = REASON_LABELS[reasonKey] || '—'
      const { bg = '#f1f5f9', color = '#475569' } = REASON_STYLE[reasonKey] || {}
      return `<tr class="${i % 2 === 1 ? 'row-alt' : ''}">
        <td class="td-num">${rowNum}</td>
        <td class="td-name">${esc(emp.lastName)} ${esc(emp.firstName)}</td>
        <td class="td-reason">${reasonKey
          ? `<span class="reason-badge" style="background:${bg};color:${color}">${esc(reasonLabel)}</span>`
          : '<span style="color:#94a3b8">—</span>'}</td>
        <td class="td-note">${esc(abs?.note || '') || '<span style="color:#94a3b8">—</span>'}</td>
      </tr>`
    }).join('')

    return deptRow + empRows
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Davomat – KAFTIMDA</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#1e293b; }

  .hdr { background:#0f1c3a; color:#fff; padding:13px 18px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #D97706; margin-bottom:7px; }
  .hdr-l .brand-wrap { display:inline-block; }
  .hdr-l .brand { font-size:22px; font-weight:900; letter-spacing:1px; line-height:1.1; }
  .hdr-l .brand .kaft { color:#D97706; }
  .hdr-l .brand .imda { color:#ffffff; }
  .hdr-l .amber   { width:100%; height:2.5px; background:#D97706; border-radius:1px; margin-top:5px; }
  .hdr-l .tagline { font-size:9px; color:#93c5fd; margin-top:3px; letter-spacing:0.3px; }
  .hdr-l .sub     { font-size:10px; color:#93c5fd; margin-top:5px; line-height:1.7; font-weight:500; }
  .hdr-r { display:flex; align-items:center; gap:22px; }
  .hdr-r .contacts { text-align:right; }
  .hdr-r .detail { font-size:9.5px; color:#94a3b8; margin-top:3px; display:flex; align-items:center; justify-content:flex-end; gap:4px; }
  .hdr-r .detail:first-child { margin-top:0; }

  .stats { display:flex; gap:6px; margin-bottom:8px; }
  .card  { flex:1; border-radius:6px; padding:7px 10px; border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:16px; font-weight:700; }
  .card-lbl { font-size:8px; color:#64748b; margin-top:1px; }

  .section-hdr { background:#1e40af; color:#fff; font-size:10px; font-weight:700;
                 padding:4px 8px; border-radius:4px 4px 0 0; margin-top:8px; letter-spacing:.3px; }

  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead { display:table-header-group; }
  thead tr { background:#334155; color:#fff; }
  thead th { padding:6px 8px; text-align:left; font-weight:600; font-size:9px; white-space:nowrap; }
  .th-num  { width:24px; text-align:center; }
  .row-alt { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #f1f5f9; page-break-inside:avoid; }
  tbody td { padding:6px 8px; vertical-align:middle; }
  .td-num    { color:#94a3b8; text-align:center; width:24px; }
  .td-name   { font-weight:600; font-size:11px; white-space:nowrap; }
  .td-reason { white-space:nowrap; }
  .td-note   { color:#64748b; font-size:9.5px; }
  .reason-badge { padding:2px 8px; border-radius:10px; font-size:9.5px; font-weight:700; }

  .dept-group-row td { background:#dbeafe; color:#1e3a8a; font-weight:700;
                       font-size:10px; padding:5px 8px; page-break-after:avoid; }
  .dept-count { margin-left:8px; font-size:9px; color:#2563eb;
                background:#bfdbfe; padding:1px 7px; border-radius:8px; font-weight:600; }

  .all-present { text-align:center; padding:28px; color:#15803d; font-weight:700;
                 font-size:13px; background:#f0fdf4; border-radius:8px;
                 border:1px solid #bbf7d0; margin-top:8px; }

  .legend { display:flex; align-items:center; gap:10px; margin-top:8px;
            padding-top:6px; border-top:1px solid #e2e8f0; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:9px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }

  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:5px; border-top:1px solid #e2e8f0; font-size:8.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    tbody tr { page-break-inside:avoid; }
  }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-l">
    <div class="brand-wrap">
      <div class="brand"><span class="kaft">KAFT</span><span class="imda">IMDA</span></div>
      <div class="amber"></div>
    </div>
    <div class="tagline">Biznesingiz kaftingizda</div>
    <div class="sub">Davomat hisoboti &nbsp;·&nbsp; ${fmtDate(date)}<br>Chiqarilgan: ${printed}</div>
  </div>
  <div class="hdr-r">
    <div class="contacts">
      <div class="detail">kaftimda@gmail.com</div>
      <div class="detail">
        <svg viewBox="0 0 16 16" width="11" height="11" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.3 6.9c1 2 2.8 3.7 4.8 4.8l1.6-1.6c.2-.2.5-.3.7-.1.8.3 1.7.5 2.6.5.4 0 .7.3.7.7V14c0 .4-.3.7-.7.7C6 14.7 1.3 10 1.3 4.3c0-.4.3-.7.7-.7H5c.4 0 .7.3.7.7 0 1 .2 1.9.5 2.7.1.3 0 .6-.2.7L3.3 6.9z" fill="#94a3b8"/>
        </svg>
        +998 91 760 66 66
      </div>
      <div class="detail">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="#94a3b8"/>
        </svg>
        @KAFTIMDA
      </div>
    </div>
  </div>
</div>

<div class="stats">
  <div class="card" style="background:#eff6ff">
    <div class="card-val" style="color:#1e40af">${allEmps.length}</div>
    <div class="card-lbl">Jami xodimlar</div>
  </div>
  <div class="card" style="background:#f0fdf4">
    <div class="card-val" style="color:#15803d">${totalPresent}</div>
    <div class="card-lbl">Kelgan</div>
  </div>
  <div class="card" style="background:#fef2f2">
    <div class="card-val" style="color:#991b1b">${totalAbsent}</div>
    <div class="card-lbl">Kelmagan</div>
  </div>
</div>

${totalAbsent === 0
  ? `<div class="all-present">✓ Barcha xodimlar kelgan</div>`
  : `<div class="section-hdr">Kelmaganlar ro'yxati — ${totalAbsent} nafar</div>
     <table>
       <thead>
         <tr>
           <th class="th-num">#</th>
           <th>Ism Familyasi</th>
           <th>Sabab</th>
           <th>Izoh</th>
         </tr>
       </thead>
       <tbody>${tableRows}</tbody>
     </table>`
}

<div class="legend">
  <div class="legend-item"><div class="dot" style="background:#dbeafe;border:1px solid #bfdbfe"></div>Kasallik</div>
  <div class="legend-item"><div class="dot" style="background:#f3e8ff;border:1px solid #e9d5ff"></div>Ta'til</div>
  <div class="legend-item"><div class="dot" style="background:#fee2e2;border:1px solid #fecaca"></div>Sababsiz</div>
  <div class="legend-item"><div class="dot" style="background:#f1f5f9;border:1px solid #e2e8f0"></div>Boshqa</div>
</div>

<div class="footer">
  <div class="brand">KAFTIMDA</div>
  <div>kaftimda@gmail.com &nbsp;·&nbsp; +998 91 760 66 66</div>
</div>

<scr` + `ipt>window.onload=function(){window.print()}<\/script>
</body>
</html>`

  return html
}

export function exportAttendancePDF(absentEmps, allEmps, absences, departments, date) {
  const html = buildAttendancePDFHtml(absentEmps, allEmps, absences, departments, date)
  const win = window.open('', '_blank', 'width=900,height=850')
  if (!win) {
    alert("Brauzer popup'ni blokladi. Iltimos, ruxsat bering va qaytadan bosing.")
    return
  }
  win.document.write(html)
  win.document.close()
}
`````


## `ishlab-chiqarish/src/utils/excel.js`

`````js
import * as XLSX from 'xlsx'

export function exportExcel(rows, filters, deptName, showDept = true) {
  const cols = showDept
    ? ['#', 'Ismi Familyasi', "Bo'lim", 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Foiz', 'Izoh']
    : ['#', 'Ismi Familyasi', 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Foiz', 'Izoh']
  const colCount = cols.length

  const header = [
    ['KAFTIMDA', ...Array(colCount - 1).fill('')],
    ['kaftimda@gmail.com', ...Array(colCount - 1).fill('')],
    ['+998 91 760 66 66', ...Array(colCount - 1).fill('')],
    [`${deptName} · ${filters}`, ...Array(colCount - 1).fill('')],
    [],
    cols,
  ]

  const data = rows.map((r, i) => {
    const exp = Number(r.expected) || 0
    const pct = exp > 0 ? Math.round((Number(r.quantity) / exp) * 100) + '%' : '—'
    // Shaxsiy norma bo'lsa belgilanadi
    const normCell = r.isCustomNorm ? `${r.norm} (shaxsiy)` : r.norm
    return showDept
      ? [i + 1, r.empName, r.deptName, r.opName, normCell, r.quantity, Number(exp.toFixed(0)), pct, r.note || '']
      : [i + 1, r.empName, r.opName, normCell, r.quantity, Number(exp.toFixed(0)), pct, r.note || '']
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data])

  ws['!cols'] = showDept
    ? [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }]
    : [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }]

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Hisobot')
  XLSX.writeFile(wb, `hisobot_${Date.now()}.xlsx`)
}

const REASON_LABELS_XL = {
  kasallik: 'Kasallik',
  tatil:    "Ta'til",
  sababsiz: 'Sababsiz',
  boshqa:   'Boshqa',
}

function fmtDateXl(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function exportAttendanceExcel(absentEmps, allEmps, absences, departments, date) {
  const getDeptName  = id => departments.find(d => d.id === id)?.name || id
  const totalPresent = allEmps.length - absentEmps.length

  // Fixed header rows (indexes 0-6)
  const headerRows = [
    ['KAFTIMDA', '', '', ''],
    ['kaftimda@gmail.com', '', '', ''],
    ['+998 91 760 66 66', '', '', ''],
    [`Davomat hisoboti · ${fmtDateXl(date)}`, '', '', ''],
    [`Jami: ${allEmps.length}  |  Kelgan: ${totalPresent}  |  Kelmagan: ${absentEmps.length}`, '', '', ''],
    [],
    ['#', 'Ism Familyasi', 'Sabab', 'Izoh'],
  ]
  const HEADER_COUNT = headerRows.length // 7

  // Group by department
  const deptGroups = departments
    .map(dept => ({ dept, emps: absentEmps.filter(e => e.departmentId === dept.id) }))
    .filter(g => g.emps.length > 0)

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
  ]

  let currentRow = HEADER_COUNT
  const dataRows = []

  deptGroups.forEach(({ dept, emps }) => {
    // Department header row (merged across all columns)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } })
    dataRows.push([`${dept.name}  (${emps.length} nafar)`, '', '', ''])
    currentRow++

    emps.forEach((emp, i) => {
      const abs = absences[emp.id]
      dataRows.push([
        i + 1,
        `${emp.lastName} ${emp.firstName}`,
        REASON_LABELS_XL[abs?.reason] || '',
        abs?.note || '',
      ])
      currentRow++
    })
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])

  ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 30 }]
  ws['!merges'] = merges

  XLSX.utils.book_append_sheet(wb, ws, 'Davomat')
  XLSX.writeFile(wb, `davomat_${date}.xlsx`)
}
`````


## `ishlab-chiqarish/src/utils/telegram.js`

`````js
export async function sendTelegramMessage(chatId, text) {
  if (!chatId) return
  const res = await fetch('/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, text }),
  })
  if (!res.ok) return // xodimga xabar ketmasa tizim to'xtamaydi
  return res.json()
}

export async function sendHTMLToTelegram(html, filename, caption = '', threadId) {
  const res = await fetch('/api/html-to-telegram-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename, caption, threadId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Server xatolik (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Telegram xatolik')
  return data
}

export async function sendPDFToTelegram(pdfBlob, filename, caption = '') {
  const arrayBuffer = await pdfBlob.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)
  let binary = ''
  uint8.forEach(b => { binary += String.fromCharCode(b) })
  const base64 = btoa(binary)

  const res = await fetch('/api/send-telegram-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf: base64, filename, caption }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Server xatolik (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Telegram xatolik')
  return data
}
`````


## `ishlab-chiqarish/src/pages/Login.jsx`

`````jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Factory, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, signUp, error, setError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      navigate('/')
    } catch (err) {
      if (isRegister) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Bu email allaqachon ro\'yxatdan o\'tgan')
        } else if (err.code === 'auth/weak-password') {
          setError('Parol kamida 6 belgidan iborat bo\'lishi kerak')
        } else {
          setError('Xatolik yuz berdi. Qayta urinib ko\'ring')
        }
      } else {
        setError('Email yoki parol noto\'g\'ri')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-800/20 rounded-full blur-3xl" />
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KAFTIMDA</h1>
          <p className="text-gray-500 text-sm mt-1">Biznesingiz kaftingizda</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
              placeholder="email@misol.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-60 mt-2 shadow-sm hover:shadow-md"
          >
            {loading ? '...' : isRegister ? 'Ro\'yxatdan o\'tish' : 'Kirish'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(r => !r); setError('') }}
            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
          >
            {isRegister ? 'Hisobim bor — Kirish' : 'Yangi hisob — Ro\'yxatdan o\'tish'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          kaftimda@gmail.com · +998 91 760 66 66
        </p>
      </div>
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Dashboard.jsx`

`````jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { format, subDays } from 'date-fns'
import { Users, Settings, TrendingUp, ChevronRight, Package, AlertTriangle } from 'lucide-react'
import { computeOrderChain, forecastOrder } from '../utils/orderProgress'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const today = format(new Date(), 'yyyy-MM-dd')

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function effColor(eff) {
  if (eff === null) return { text: 'text-gray-400', bg: 'bg-gray-100', bar: 'bg-gray-300', hex: '#94a3b8' }
  if (eff >= 100)  return { text: 'text-green-700', bg: 'bg-green-50',  bar: 'bg-green-500',  hex: '#16a34a' }
  if (eff >= 80)   return { text: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-400', hex: '#ca8a04' }
  return                  { text: 'text-red-700',   bg: 'bg-red-50',    bar: 'bg-red-500',    hex: '#dc2626' }
}

// Shorten dept names for chart axis (remove "bo'limi")
function shortName(name) {
  return name.replace(/\s*bo['']limi/i, '').trim()
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  )
}

// Modul darajasidagi kesh — Dashboard qisqa vaqt ichida qayta ochilsa, qayta o'qimaydi
const DASH_TTL = 60000 // 60 soniya
let _dashToday = { key: '', ts: 0, data: null }
let _dashWeek  = { key: '', ts: 0, data: null }
let _dashOrders = { key: '', ts: 0, data: null }

export default function Dashboard() {
  const { departments: allDepartments, getDeptName } = useDepartments()
  const { userDoc, can } = useAuth()
  const departments = can.manageMembers || !userDoc?.departmentIds?.length
    ? allDepartments
    : allDepartments.filter(d => userDoc.departmentIds.includes(d.id))
  const [stats, setStats]       = useState({ employees: 0, operations: 0 })
  const [deptStats, setDeptStats] = useState({})
  const [opsByDept, setOpsByDept] = useState({})
  const [weekData, setWeekData]   = useState([])
  const [loading, setLoading]     = useState(true)

  // Today's stats
  useEffect(() => {
    if (!departments.length) return
    const cacheKey = departments.map(d => d.id).join(',')
    // Kesh yangi bo'lsa — qayta o'qimaymiz
    if (_dashToday.key === cacheKey && _dashToday.data && Date.now() - _dashToday.ts < DASH_TTL) {
      const c = _dashToday.data
      setStats(c.stats)
      setDeptStats(c.deptStats)
      setOpsByDept(c.opsByDept)
      setLoading(false)
      return
    }
    async function load() {
      const [empSnap, opSnap] = await Promise.all([
        getDocs(collection(db, 'factory_employees')),
        getDocs(collection(db, 'factory_operations')),
      ])

      const normMap = {}
      const finalOpMap = {}
      opSnap.forEach(d => {
        const data = d.data()
        normMap[d.id] = data.norm || 0
        if (data.isFinal) finalOpMap[data.departmentId] = d.id
      })

      const entriesSnap = await getDocs(
        query(collection(db, 'factory_work_entries'), where('date', '==', today))
      )

      const visibleDeptIds = new Set(departments.map(d => d.id))

      const deptData = {}
      departments.forEach(d => {
        deptData[d.id] = { employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
      })

      empSnap.forEach(doc => {
        const emp = doc.data()
        if (deptData[emp.departmentId] && emp.isActive !== false) deptData[emp.departmentId].employees++
      })

      const visibleEmpCount = empSnap.docs.filter(d => visibleDeptIds.has(d.data().departmentId) && d.data().isActive !== false).length
      const visibleOpCount = opSnap.docs.filter(d => visibleDeptIds.has(d.data().departmentId)).length

      const seenEmp = new Set()
      const opQty = {}
      entriesSnap.forEach(doc => {
        const d = doc.data()
        const dd = deptData[d.departmentId]
        if (!dd) return
        const key = `${d.departmentId}_${d.employeeId}`
        if (!seenEmp.has(key)) { seenEmp.add(key); dd.attended++ }
        const hours = calcHours(d.startTime, d.endTime)
        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          const qty = Number(val.quantity || 0)
          dd.done     += qty
          // Saqlangan expected (shaxsiy norma bilan) — bo'lmasa umumiy normadan hisoblanadi
          dd.expected += val.expected !== undefined ? Number(val.expected) : (normMap[opId] || 0) * hours
          if (finalOpMap[d.departmentId] === opId) dd.tayyor += qty
          opQty[opId] = (opQty[opId] || 0) + qty
        })
      })

      const opsByDeptData = {}
      departments.forEach(d => { opsByDeptData[d.id] = [] })
      opSnap.forEach(d => {
        const data = d.data()
        if (!opsByDeptData[data.departmentId]) return
        opsByDeptData[data.departmentId].push({
          id: d.id,
          name: data.name,
          order: data.order ?? Infinity,
          qty: opQty[d.id] || 0,
        })
      })
      Object.values(opsByDeptData).forEach(arr => arr.sort((a, b) => b.qty - a.qty))

      const stats = { employees: visibleEmpCount, operations: visibleOpCount }
      setStats(stats)
      setDeptStats(deptData)
      setOpsByDept(opsByDeptData)
      setLoading(false)
      _dashToday = { key: cacheKey, ts: Date.now(), data: { stats, deptStats: deptData, opsByDept: opsByDeptData } }
    }
    load()
  }, [departments])

  // Last 7 days trend
  useEffect(() => {
    if (!departments.length) return
    const cacheKey = departments.map(d => d.id).join(',')
    if (_dashWeek.key === cacheKey && _dashWeek.data && Date.now() - _dashWeek.ts < DASH_TTL) {
      setWeekData(_dashWeek.data)
      return
    }
    async function loadWeek() {
      const last7 = Array.from({ length: 7 }, (_, i) =>
        format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
      )

      const weekDeptIds = new Set(departments.map(d => d.id))

      const [opSnap, entriesSnap] = await Promise.all([
        getDocs(collection(db, 'factory_operations')),
        getDocs(query(
          collection(db, 'factory_work_entries'),
          where('date', '>=', last7[0]),
          where('date', '<=', last7[6])
        )),
      ])

      const normMap = {}
      opSnap.forEach(d => { normMap[d.id] = d.data().norm || 0 })

      const dayMap = {}
      last7.forEach(d => { dayMap[d] = { done: 0, expected: 0 } })

      entriesSnap.forEach(doc => {
        const d = doc.data()
        if (!weekDeptIds.has(d.departmentId)) return
        const day = dayMap[d.date]
        if (!day) return
        const hours = calcHours(d.startTime, d.endTime)
        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          day.done     += Number(val.quantity || 0)
          day.expected += val.expected !== undefined ? Number(val.expected) : (normMap[opId] || 0) * hours
        })
      })

      const wd = last7.map(date => ({
        date: date.slice(5).replace('-', '.'),
        samaradorlik: dayMap[date].expected > 0
          ? Math.round((dayMap[date].done / dayMap[date].expected) * 100)
          : null,
      }))
      setWeekData(wd)
      _dashWeek = { key: cacheKey, ts: Date.now(), data: wd }
    }
    loadWeek()
  }, [departments])

  // Active orders progress (buyurtmalar holati) — keshlanadi
  const [orderStats, setOrderStats] = useState([])
  useEffect(() => {
    if (!departments.length) return
    const cacheKey = departments.map(d => d.id).join(',')
    if (_dashOrders.key === cacheKey && _dashOrders.data && Date.now() - _dashOrders.ts < DASH_TTL) {
      setOrderStats(_dashOrders.data); return
    }
    let cancelled = false
    async function loadOrders() {
      try {
        const orderSnap = await getDocs(collection(db, 'factory_orders'))
        const allOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.isActive !== false)
        const visibleIds = new Set(departments.map(d => d.id))
        const orders = allOrders.filter(o => visibleIds.has(o.departmentId))
        if (orders.length === 0) { if (!cancelled) { setOrderStats([]); _dashOrders = { key: cacheKey, ts: Date.now(), data: [] } } return }

        const opSnap = await getDocs(collection(db, 'factory_operations'))
        const opById = {}
        opSnap.forEach(d => { const o = d.data(); opById[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })

        // Eski (entry.orderId) + yangi (op ichidagi orderId → entry.orderIds) yozuvlarni birlashtiramiz
        const qids = [...orders.map(o => o.id), 'auto']
        const byDoc = new Map()
        for (let i = 0; i < qids.length; i += 30) {
          const chunk = qids.slice(i, i + 30)
          const [legacy, tagged] = await Promise.all([
            getDocs(query(collection(db, 'factory_work_entries'), where('orderId', 'in', chunk))),
            getDocs(query(collection(db, 'factory_work_entries'), where('orderIds', 'array-contains-any', chunk))),
          ])
          legacy.forEach(d => byDoc.set(d.id, d.data()))
          tagged.forEach(d => byDoc.set(d.id, d.data()))
        }
        const entries = [...byDoc.values()]

        const stats = orders.map(o => {
          const chain = computeOrderChain(o, entries, opById, departments, { allOrders })
          return { order: o, chain, forecast: forecastOrder(o, chain.doneQty) }
        }).sort((a, b) => (a.chain.done ? 1 : 0) - (b.chain.done ? 1 : 0) || (a.order.order ?? 0) - (b.order.order ?? 0))

        if (!cancelled) { setOrderStats(stats); _dashOrders = { key: cacheKey, ts: Date.now(), data: stats } }
      } catch (_) { if (!cancelled) setOrderStats([]) }
    }
    loadOrders()
    return () => { cancelled = true }
  }, [departments])

  const totalAttended = Object.values(deptStats).reduce((s, d) => s + d.attended, 0)
  const totalDone     = Object.values(deptStats).reduce((s, d) => s + d.done, 0)
  const totalExp      = Object.values(deptStats).reduce((s, d) => s + d.expected, 0)
  const totalEff      = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : null
  const totalTayyor   = Object.values(deptStats).reduce((s, d) => s + (d.tayyor || 0), 0)

  // Bar chart data: departments with today's efficiency
  const deptChartData = departments
    .map(d => {
      const ds = deptStats[d.id]
      const eff = ds?.expected > 0 ? Math.round((ds.done / ds.expected) * 100) : 0
      return { name: shortName(d.name), eff }
    })
    .filter(d => d.eff > 0)

  const hasWeekData = weekData.some(d => d.samaradorlik !== null)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.employees}</div>
              <div className="text-xs text-gray-500">Jami xodimlar</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : totalAttended}</div>
              <div className="text-xs text-gray-500">Bugun kelgan</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.operations}</div>
              <div className="text-xs text-gray-500">Operatsiyalar</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loading || totalEff === null ? 'bg-gray-100' : effColor(totalEff).bg}`}>
              <TrendingUp className={`w-5 h-5 ${loading || totalEff === null ? 'text-gray-400' : effColor(totalEff).text}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${loading || totalEff === null ? 'text-gray-400' : effColor(totalEff).text}`}>
                {loading ? '—' : totalEff === null ? '—' : `${totalEff}%`}
              </div>
              <div className="text-xs text-gray-500">Bugungi samaradorlik</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : totalTayyor}</div>
              <div className="text-xs text-gray-500">Tayyor mahsulot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

        {/* Line chart: last 7 days */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="text-sm font-semibold text-gray-700 mb-4">Oxirgi 7 kun samaradorligi</div>
          {!hasWeekData ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Ma'lumot yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="samaradorlik"
                  name="Samaradorlik"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                {/* 100% reference line */}
                <CartesianGrid stroke="none" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart: department comparison today */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <div className="text-sm font-semibold text-gray-700 mb-4">Bo'limlar samaradorligi — bugun</div>
          {deptChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Bugun ma'lumot kiritilmagan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptChartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Samaradorlik']}
                  labelStyle={{ fontWeight: 600, fontSize: 12 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="eff" name="Samaradorlik" radius={[4, 4, 0, 0]}>
                  {deptChartData.map((entry, i) => (
                    <Cell key={i} fill={effColor(entry.eff).hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Buyurtmalar holati */}
      {orderStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Package className="w-4 h-4" /> Buyurtmalar holati
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orderStats.map(({ order, chain, forecast }) => {
              const bn = chain.depts.find(d => d.bottleneck)?.bottleneck
              const opbnDept = chain.depts.find(d => d.opBottleneck)
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{order.name}</div>
                      <div className="text-xs text-gray-400">{order.quantity?.toLocaleString()} dona · {getDeptName(order.departmentId)}</div>
                    </div>
                    {chain.done
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold shrink-0">✅ Bajarildi</span>
                      : <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">{chain.percent}%</span>}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Tayyor: <b className="text-gray-700">{chain.doneQty.toLocaleString()}</b> / {chain.orderQty.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${chain.done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(chain.percent, 100)}%` }} />
                  </div>
                  {bn && !chain.done && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Tiqilish: <b>{bn.name}</b> ({bn.qty.toLocaleString()})
                    </div>
                  )}
                  {opbnDept && !chain.done && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {opbnDept.name}: <b>{opbnDept.opBottleneck.name}</b> ({opbnDept.opBottleneck.qty.toLocaleString()})
                    </div>
                  )}
                  {forecast && !forecast.done && !chain.done && (
                    <div className="mt-1.5 text-xs text-gray-500">📈 Taxminan: <b className="text-gray-700">{forecast.date}</b> ({forecast.daysLeft} kun)</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Departments grid */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Bo'limlar — bugun</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {departments.map(dept => {
          const ds = deptStats[dept.id] || { employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
          const attendPct = ds.employees ? Math.round((ds.attended / ds.employees) * 100) : 0
          const eff = ds.expected > 0 ? Math.round((ds.done / ds.expected) * 100) : null
          const ec = effColor(eff)
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {ds.employees} xodim
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>

              <div className="text-sm font-semibold text-gray-800 mb-3">{dept.name}</div>

              <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-green-50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold text-green-700">{ds.attended}</div>
                  <div className="text-xs text-green-600">Kelgan</div>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold text-red-600">{Math.max(0, ds.employees - ds.attended)}</div>
                  <div className="text-xs text-red-500">Kelmagan</div>
                </div>
              </div>

              <div className="mb-2">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(attendPct, 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Samaradorlik</span>
                  <span className={`font-bold ${ec.text}`}>{eff === null ? '—' : `${eff}%`}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`${ec.bar} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(eff ?? 0, 100)}%` }} />
                </div>
              </div>

              {ds.tayyor > 0 && (
                <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div className="text-xs text-amber-700">
                    <strong>{ds.tayyor}</strong> tayyor mahsulot
                  </div>
                </div>
              )}

              {opsByDept[dept.id]?.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                  {opsByDept[dept.id].map(op => (
                    <div key={op.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 truncate">{op.name}</span>
                      <span className="font-semibold text-gray-700 shrink-0 ml-2">{op.qty} dona</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/DepartmentWork.jsx`

`````jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs,
  doc, setDoc, serverTimestamp, documentId,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, Save, CheckCircle, RefreshCw, X, Search, MoreVertical, Send, AlarmClock, UserPlus, AlertTriangle, Package, Plus } from 'lucide-react'
import { buildWorkPDFHtml } from '../utils/pdf'
import { sendHTMLToTelegram, sendTelegramMessage } from '../utils/telegram'
import { fetchOrderSummary } from '../utils/orderReport'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

// Bo'lim uchun Telegram mavzu (forum topic) ID'si — nom/ID bo'yicha moslaydi.
function threadForDept(dept) {
  if (!dept) return undefined
  if (dept.telegramThreadId != null) return dept.telegramThreadId
  const s = `${dept.id || ''} ${dept.name || ''}`.toLowerCase()
  if (s.includes('shim')) return 1014
  if (s.includes('kamzul') || s.includes('камзул')) return 1017
  if (s.includes('tana') || s.includes('astar') || s.includes('montaj') || s.includes('yeng')) return 1015
  return undefined
}

function normStatus(quantity, norm, hours) {
  const expected = norm * hours
  if (!expected || quantity === '' || quantity === null) return 'none'
  const qty = Number(quantity)
  if (qty > expected) return 'above'
  if (qty === expected) return 'equal'
  return 'below'
}

// Xodimning shu operatsiya uchun berilgan sanada amal qiluvchi normasi.
// Shaxsiy norma (customNorms) bo'lsa va sanaga mos kelsa — o'shani, aks holda umumiy normani qaytaradi.
function effectiveNorm(emp, opId, globalNorm, date) {
  const hist = emp?.customNorms?.[opId]
  if (!Array.isArray(hist) || hist.length === 0) return globalNorm
  let best = null
  for (const h of hist) {
    if (h.from <= date && (!best || h.from > best.from)) best = h
  }
  return best ? Number(best.norm) : globalNorm
}

const statusStyle = {
  above: 'bg-green-100 text-green-800 border-green-200',
  equal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  below: 'bg-red-100 text-red-800 border-red-200',
  none: 'bg-white text-gray-700 border-gray-200',
}

export default function DepartmentWork() {
  const { deptId } = useParams()
  const { user, userDoc, can } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const dept = departments.find(d => d.id === deptId)

  const hasAccess = can.manageMembers || !userDoc?.departmentIds?.length || userDoc.departmentIds.includes(deptId)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [entries, setEntries] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [dirtyEmps, setDirtyEmps] = useState({})
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [overrides, setOverrides] = useState({})
  // Buyurtma tanlash (3-bosqich)
  const [orders, setOrders] = useState([])          // shu bo'limning faol buyurtmalari
  const [defaultOrder, setDefaultOrder] = useState('none') // 'none' | 'auto' | orderId (hamma uchun)
  const [empOrders, setEmpOrders] = useState({})    // { empId: 'none'|'auto'|orderId } — xodim uchun standart
  const [opOrders, setOpOrders] = useState({})      // { empId: { opId: 'none'|'auto'|orderId } } — har operatsiya alohida
  // Bir operatsiyani bir nechta buyurtmага bo'lish: qo'shimcha qatorlar (birinchidan keyingi ulushlar)
  const [opSplits, setOpSplits] = useState({})      // { empId: { opId: [{ quantity, note, orderId }] } }
  const [empTimes, setEmpTimes] = useState({})
  const [timePickerEmp, setTimePickerEmp] = useState(null)
  const [menuEmp, setMenuEmp] = useState(null)
  const [pickerEmp, setPickerEmp] = useState(null)
  const [pickerSel, setPickerSel] = useState([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [search, setSearch] = useState('')
  const [activeShift, setActiveShift] = useState(null)
  const [tgSending, setTgSending] = useState(false)
  const [tgMsg, setTgMsg] = useState('')
  const [emptyWarning, setEmptyWarning] = useState(null) // null | [{id, lastName, firstName}]

  // Guest worker state
  const [guestEmps, setGuestEmps] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [showGuestPicker, setShowGuestPicker] = useState(false)
  const [guestSearch, setGuestSearch] = useState('')
  const [guestWarning, setGuestWarning] = useState('')
  const [guestNotice, setGuestNotice] = useState('') // ogohlantirish, lekin to'smaydi
  const [pendingGuest, setPendingGuest] = useState(null)
  const [removingGuestId, setRemovingGuestId] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'factory_shifts'), where('isActive', '==', true)))
      .then(snap => {
        if (!snap.empty) {
          const shift = { id: snap.docs[0].id, ...snap.docs[0].data() }
          setActiveShift(shift)
        }
      })
  }, [])

  // Load employees in this dept
  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))
    return onSnapshot(q, snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.isActive !== false).sort((a, b) => {
        const aO = a.order ?? Infinity
        const bO = b.order ?? Infinity
        if (aO !== bO) return aO - bO
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
      }))
    })
  }, [deptId])

  // Barcha faol buyurtmalar (har bo'lim tanlashi mumkin — zanjirdagi bo'limlar ham, masalan Montaj)
  useEffect(() => {
    getDocs(collection(db, 'factory_orders'))
      .then(snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(o => o.isActive !== false)
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        setOrders(list)
      })
      .catch(() => setOrders([]))
  }, [deptId])

  // Load all employees for guest picker
  useEffect(() => {
    getDocs(collection(db, 'factory_employees')).then(snap => {
      setAllEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.isActive !== false))
    })
  }, [])

  // Reset guests when dept changes
  useEffect(() => {
    setGuestEmps([])
  }, [deptId])

  // Load all operations
  useEffect(() => {
    getDocs(collection(db, 'factory_operations')).then(snap => {
      setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  // Load overrides from localStorage when date or dept changes
  useEffect(() => {
    if (!date) { setOverrides({}); return }
    try {
      const saved = localStorage.getItem(`op_overrides_${deptId}_${date}`)
      setOverrides(saved ? JSON.parse(saved) : {})
    } catch { setOverrides({}) }
  }, [deptId, date])

  // Reset dirty flag and entries when date/time changes
  useEffect(() => {
    setPickerEmp(null)
    setIsDirty(false)
    setEntries({})
    setDirtyEmps({})
    setGuestEmps([])
    setEmpOrders({})
    setOpOrders({})
    setOpSplits({})
  }, [date, startTime, endTime])

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Load existing entries
  useEffect(() => {
    if (!date || !startTime || !endTime) return
    const shiftPrefix = `${date}_${deptId}_${startTime.replace(':','')}_${endTime.replace(':','')}_`
    const q = query(
      collection(db, 'factory_work_entries'),
      where(documentId(), '>=', shiftPrefix),
      where(documentId(), '<', shiftPrefix + ''),
    )
    return onSnapshot(q, snap => {
      const data = {}
      const loadedOrders = {}
      const loadedOpOrders = {}
      const loadedSplits = {}
      let loadedBreak = null
      snap.forEach(d => {
        const { employeeId, operations, breakMinutes: bm, orderId } = d.data()
        data[employeeId] = operations || {}
        // Har operatsiya uchun saqlangan buyurtma (yangi model) + bo'linishlar (allocations)
        const opo = {}
        const splits = {}
        Object.entries(operations || {}).forEach(([opId, v]) => {
          if (v && Array.isArray(v.allocations) && v.allocations.length) {
            // Birinchi ulush — asosiy qator, qolganlari qo'shimcha ("+") qatorlar
            const [first, ...rest] = v.allocations
            opo[opId] = first.orderId == null ? 'none' : first.orderId
            data[employeeId][opId] = { ...v, quantity: first.quantity ?? '', note: first.note ?? v.note ?? '' }
            if (rest.length) splits[opId] = rest.map(a => ({ quantity: a.quantity ?? '', note: a.note ?? '', orderId: a.orderId == null ? 'none' : a.orderId }))
          } else if (v && v.orderId !== undefined) {
            opo[opId] = v.orderId === null ? 'none' : v.orderId
          }
        })
        if (Object.keys(opo).length) loadedOpOrders[employeeId] = opo
        if (Object.keys(splits).length) loadedSplits[employeeId] = splits
        // Eski model: butun yozuv uchun bitta buyurtma (xodim standarti sifatida)
        if (orderId !== undefined && orderId !== null) loadedOrders[employeeId] = orderId
        if (bm !== undefined) loadedBreak = bm
      })
      setEntries(data)
      setEmpOrders(loadedOrders)
      setOpOrders(loadedOpOrders)
      setOpSplits(loadedSplits)
      if (loadedBreak !== null) setBreakMinutes(loadedBreak)
    }, err => {
      console.error('[DepartmentWork] entries onSnapshot error:', err)
    })
  }, [deptId, date, startTime, endTime])

  const setEntryVal = (empId, opId, field, value) => {
    setEntries(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [opId]: { ...prev[empId]?.[opId], [field]: value },
      },
    }))
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Bitta operatsiya uchun buyurtma tanlash
  const setOpOrder = (empId, opId, value) => {
    setOpOrders(prev => ({ ...prev, [empId]: { ...prev[empId], [opId]: value } }))
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Operatsiyани "+" bilan yana bir buyurtmага bo'lish (qo'shimcha qator)
  const addOpSplit = (empId, opId) => {
    setOpSplits(prev => {
      const cur = prev[empId]?.[opId] || []
      return { ...prev, [empId]: { ...prev[empId], [opId]: [...cur, { quantity: '', note: '', orderId: 'auto' }] } }
    })
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }
  const removeOpSplit = (empId, opId, idx) => {
    setOpSplits(prev => {
      const cur = (prev[empId]?.[opId] || []).filter((_, i) => i !== idx)
      const empMap = { ...prev[empId] }
      if (cur.length) empMap[opId] = cur; else delete empMap[opId]
      return { ...prev, [empId]: empMap }
    })
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }
  const setOpSplitVal = (empId, opId, idx, field, value) => {
    setOpSplits(prev => {
      const cur = (prev[empId]?.[opId] || []).map((l, i) => i === idx ? { ...l, [field]: value } : l)
      return { ...prev, [empId]: { ...prev[empId], [opId]: cur } }
    })
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Xodimning barcha operatsiyalari uchun buyurtmani birdaniga belgilash (standart)
  const setEmpOrderAll = (empId, value) => {
    setEmpOrders(o => ({ ...o, [empId]: value }))
    setOpOrders(o => { const n = { ...o }; delete n[empId]; return n }) // op-darajali o'zgarishlarni tozalash
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  const selectPendingGuest = async (emp) => {
    if (guestEmps.some(e => e.id === emp.id) || employees.some(e => e.id === emp.id)) return
    setGuestNotice('')
    if (date) {
      const snap = await getDocs(query(
        collection(db, 'factory_work_entries'),
        where('employeeId', '==', emp.id),
        where('date', '==', date),
      ))
      const entryWithWork = snap.docs.find(d => {
        if (d.data().departmentId === deptId) return false  // shu bo'limdagi boshqa smena — ruxsat
        const ops = d.data().operations || {}
        return Object.values(ops).some(op => Number(op.quantity || 0) > 0 || (op.note || '').trim())
      })
      if (entryWithWork) {
        // To'smaydi — faqat ogohlantiradi. Xodim bir kunda ikki bo'limda ishlashi mumkin.
        const existingDept = departments.find(d => d.id === entryWithWork.data().departmentId)
        setGuestNotice(`${emp.lastName} ${emp.firstName} bugun ${existingDept?.name || "boshqa bo'limda"} allaqachon ishlagan. Baribir qo'shsangiz bo'ladi.`)
      }
    }
    setPendingGuest(emp)
  }

  const confirmGuest = () => {
    if (!pendingGuest) return
    setPickerSel([])
    setPickerSearch('')
    // Stay in modal, move to ops step
  }

  const addGuestWithOps = () => {
    if (!pendingGuest) return
    setGuestEmps(prev => [...prev, pendingGuest])
    setOverrides(o => ({ ...o, [pendingGuest.id]: pickerSel }))
    setPendingGuest(null)
    setShowGuestPicker(false)
    setGuestSearch('')
    setGuestWarning('')
    setGuestNotice('')
    setPickerSel([])
    setPickerSearch('')
  }

  const removeGuest = (empId) => {
    setGuestEmps(prev => prev.filter(e => e.id !== empId))
    setOverrides(o => { const n = { ...o }; delete n[empId]; return n })
    setEntries(prev => { const n = { ...prev }; delete n[empId]; return n })
  }

  const saveEmployee = async (empId) => {
    setSaving(s => ({ ...s, [empId]: true }))
    const emp = employees.find(e => e.id === empId) || guestEmps.find(e => e.id === empId)
    const isGuest = guestEmps.some(e => e.id === empId)
    const empStart = empTimes[empId]?.startTime || startTime
    const empEnd = empTimes[empId]?.endTime || endTime
    const entryId = `${date}_${deptId}_${startTime.replace(':','')}_${endTime.replace(':','')}_${empId}`
    const normMap = Object.fromEntries(allOps.map(o => [o.id, o.norm || 0]))
    const unitPriceMap = Object.fromEntries(allOps.map(o => [o.id, o.unitPrice || 0]))
    const salaryType = emp?.salaryType || 'hourly'
    const hourlyRate = emp?.hourlyRate || 0
    const empH = getEmpHours(empId)
    const rawOps = entries[empId] || {}
    const norm2order = (v) => (!v || v === 'none') ? null : v
    // Asosiy qator buyurtmasi: op darajasidagi tanlov → xodim standarti → umumiy standart
    const resolveOpOrder = (opId) => norm2order(opOrders[empId]?.[opId] ?? empOrders[empId] ?? defaultOrder)
    const operations = Object.fromEntries(
      Object.entries(rawOps).map(([opId, val]) => {
        const primaryQty = Number(val.quantity || 0)
        const splits = opSplits[empId]?.[opId] || []
        // Operatsiya ulushlari: asosiy qator + "+" bilan qo'shilgan qatorlar
        const allocations = [
          { quantity: primaryQty, orderId: resolveOpOrder(opId), note: val.note || '' },
          ...splits.map(l => ({ quantity: Number(l.quantity || 0), orderId: norm2order(l.orderId), note: l.note || '' })),
        ].filter(a => a.quantity > 0 || (a.note || '').trim())
        const totalQty = allocations.reduce((s, a) => s + Number(a.quantity || 0), 0)
        const unitPrice = unitPriceMap[opId] || 0
        const piecePay = unitPrice * totalQty
        const norm = effectiveNorm(emp, opId, normMap[opId] || 0, date)
        const base = { ...val, quantity: totalQty, norm, expected: norm * empH, unitPrice, piecePay }
        if (splits.length) {
          // Bir nechta buyurtma — ulushlar massivi saqlanadi, orderId noaniq (null)
          return [opId, { ...base, orderId: allocations.length === 1 ? allocations[0].orderId : null, allocations }]
        }
        return [opId, { ...base, orderId: resolveOpOrder(opId) }]
      })
    )
    const totalPiecePay = Object.values(operations).reduce((s, v) => s + (v.piecePay || 0), 0)
    // Guest employees already earn hourly pay in their home department — only piece work counts here
    const hourlyPay = (isGuest || salaryType === 'piece') ? 0 : hourlyRate * empH
    const totalPay = isGuest
      ? (salaryType === 'hourly' ? 0 : totalPiecePay)
      : (salaryType === 'hourly' ? hourlyPay
        : salaryType === 'piece' ? totalPiecePay
        : hourlyPay + totalPiecePay)
    // Buyurtmalar operatsiya darajasida saqlanadi. So'rov (query) uchun yozuvda
    // uch raydigan barcha buyurtma id'lari massivi (orderIds) ham saqlanadi.
    const orderIds = [...new Set(Object.values(operations).flatMap(o =>
      Array.isArray(o.allocations) ? o.allocations.map(a => a.orderId) : [o.orderId]
    ).filter(Boolean))]
    // Eski o'quvchilar uchun: bitta buyurtma bo'lsa o'sha, aks holda null
    const orderId = orderIds.length === 1 ? orderIds[0] : null
    await setDoc(doc(db, 'factory_work_entries', entryId), {
      employeeId: empId,
      departmentId: deptId,
      date,
      startTime: empStart,
      endTime: empEnd,
      breakMinutes,
      operations,
      salaryType,
      hourlyRate,
      totalPay,
      orderId,   // null | 'auto' (FIFO) | buyurtma id (bitta bo'lsa)
      orderIds,  // yozuvdagi barcha buyurtmalar (array-contains so'rovi uchun)
      ...(isGuest && { isGuest: true, homeDepartmentId: emp.departmentId }),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    // TV displey uchun signal — bu bo'limda smena o'zgargani belgilanadi (TV shu orqali yangilanadi)
    setDoc(doc(db, 'factory_updates', deptId), { updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
    setSaving(s => ({ ...s, [empId]: false }))
    setSaved(s => ({ ...s, [empId]: true }))
    setDirtyEmps(prev => ({ ...prev, [empId]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [empId]: false })), 2000)

    if (emp?.telegramId) {
      const opLines = Object.entries(operations).map(([opId, val]) => {
        const op = allOps.find(o => o.id === opId)
        if (!op) return ''
        const qty = Number(val.quantity || 0)
        return `• ${op.name}: ${qty} dona`
      }).filter(Boolean).join('\n')

      let dailyTotalPay = totalPay
      try {
        const todaySnap = await getDocs(query(
          collection(db, 'factory_work_entries'),
          where('date', '==', date)
        ))
        dailyTotalPay = todaySnap.docs
          .filter(d => d.data().employeeId === empId)
          .reduce((s, d) => s + Number(d.data().totalPay || 0), 0)
      } catch (_) {}

      let msg = `👤 <b>${emp.lastName} ${emp.firstName}</b>\n`
      msg += `📅 ${date}, ${empStart}–${empEnd}\n`
      msg += `⏱ Ishlagan: <b>${empH.toFixed(1)} soat</b>\n\n`
      msg += opLines ? opLines + '\n' : ''
      if (dailyTotalPay > 0) msg += `\n💰 Bugungi jami maosh: <b>${dailyTotalPay.toLocaleString()} so'm</b>`

      sendTelegramMessage(emp.telegramId, msg)
    }
  }

  const doSaveAll = async () => {
    setSavingAll(true)
    const allWorkers = [...employees, ...guestEmps]
    await Promise.all(allWorkers.map(emp => saveEmployee(emp.id)))
    setSavingAll(false)
    setSavedAll(true)
    setIsDirty(false)
    setDirtyEmps({})
    setTimeout(() => setSavedAll(false), 2500)
  }

  const saveAll = () => {
    const allWorkers = [...employees, ...guestEmps]
    const empty = allWorkers.filter(emp => {
      const ops = entries[emp.id] || {}
      const hasPrimary = Object.values(ops).some(v => Number(v.quantity || 0) > 0 || (v.note || '').trim())
      const splitMap = opSplits[emp.id] || {}
      const hasSplit = Object.values(splitMap).some(list => (list || []).some(l => Number(l.quantity || 0) > 0 || (l.note || '').trim()))
      return !hasPrimary && !hasSplit
    })
    if (empty.length > 0) {
      setEmptyWarning(empty)
    } else {
      doSaveAll()
    }
  }

  const openPicker = (emp) => {
    const current = overrides[emp.id] ?? emp.operationIds ?? []
    setPickerSel(current)
    setPickerEmp(emp.id)
    setPickerSearch('')
  }

  const applyPicker = (empId) => {
    const newOverrides = { ...overrides, [empId]: pickerSel }
    setOverrides(newOverrides)
    if (date) try { localStorage.setItem(`op_overrides_${deptId}_${date}`, JSON.stringify(newOverrides)) } catch {}
    setPickerEmp(null)
  }

  const togglePickerOp = (opId) => {
    setPickerSel(s => s.includes(opId) ? s.filter(id => id !== opId) : [...s, opId])
  }

  // Sodda usul: har bo'lim BARCHA faol buyurtmalarni ko'radi, har biri bo'lim nomi bilan
  // belgilangan (masalan "Tana — Kostyum"). Shunda Astar/Montaj ham Tana buyurtmасини
  // qo'lда tanlaydi — zanjir sozlash shart emas.
  const visibleOrders = orders
  const orderLabel = (o) => `${getDeptName(o.departmentId)} — ${o.name}`
  // Buyurtma selektori har bir bo'limда ko'rinadi (Buyurtmasiz / FIFO avto doim bor).
  // Buyurtmalar ro'yxati esa faqat shu bo'lim zanjiridagilar (Montaj — Tana/Astar/Yeng).
  const showOrderPicker = can.enterHourly

  const hours = Math.max(0, calcHours(startTime, endTime) - breakMinutes / 60)
  const getEmpHours = (empId) => {
    const t = empTimes[empId]
    if (!t || !t.startTime || !t.endTime) return hours
    return Math.max(0, calcHours(t.startTime, t.endTime) - breakMinutes / 60)
  }

  const handleSendTelegram = async () => {
    if (isDirty) {
      setTgMsg("Avval ma'lumotlarni saqlang")
      setTimeout(() => setTgMsg(''), 3000)
      return
    }

    const allWorkers = [...employees, ...guestEmps]
    const rows = []
    allWorkers.forEach(emp => {
      const empEntries = entries[emp.id] || {}
      const activeOpIds = overrides[emp.id] ?? emp.operationIds ?? []
      allOps.filter(o => activeOpIds.includes(o.id)).forEach(op => {
        const data = empEntries[op.id] || {}
        const norm = effectiveNorm(emp, op.id, op.norm || 0, date)
        const primaryOrder = opOrders[emp.id]?.[op.id] ?? empOrders[emp.id] ?? defaultOrder
        const toId = (v) => (!v || v === 'none') ? null : v
        // Har operatsiya ulushlari: asosiy qator + "+" bilan qo'shilgan buyurtма qatorlari
        const allocs = [
          { quantity: Number(data.quantity || 0), note: data.note || '', orderId: toId(primaryOrder), expected: norm * hours },
          ...(opSplits[emp.id]?.[op.id] || []).map(l => ({ quantity: Number(l.quantity || 0), note: l.note || '', orderId: toId(l.orderId), expected: 0 })),
        ]
        allocs.forEach(a => {
          rows.push({
            empName: `${emp.lastName} ${emp.firstName}`,
            deptName: dept.name,
            opName: op.name,
            norm,
            isCustomNorm: norm !== (op.norm || 0),
            quantity: a.quantity,
            expected: a.expected,
            note: a.note,
            date,
            startTime,
            endTime,
            breakMinutes,
            isFinal: !!(op.isFinal),
            orderId: a.orderId,
          })
        })
      })
    })

    const filteredRows = rows.filter(r => r.quantity > 0 || r.note.trim())
    if (!filteredRows.length) {
      setTgMsg("Kiritilgan ma'lumot yo'q")
      setTimeout(() => setTgMsg(''), 3000)
      return
    }

    setTgSending(true)
    setTgMsg('')
    try {
      let dailyTayyor = null
      try {
        const dailySnap = await getDocs(query(
          collection(db, 'factory_work_entries'),
          where('departmentId', '==', deptId),
          where('date', '==', date),
        ))
        dailyTayyor = 0
        dailySnap.forEach(d => {
          Object.entries(d.data().operations || {}).forEach(([opId, data]) => {
            const op = allOps.find(o => o.id === opId)
            if (op?.isFinal) dailyTayyor += Number(data.quantity || 0)
          })
        })
      } catch (_) {}

      // Buyurtma xulosasi + har qatorga buyurtma nomi
      let orderSummary = null
      try {
        const orderIds = [...new Set(filteredRows.map(r => r.orderId).filter(Boolean))]
        const { summary, orderById } = await fetchOrderSummary(db, orderIds, deptId)
        orderSummary = summary.length ? summary : null
        filteredRows.forEach(r => { r.orderName = r.orderId ? (orderById[r.orderId]?.name || '') : '' })
      } catch (_) {}

      const filters = `${date} · ${startTime}–${endTime}`
      const html = buildWorkPDFHtml(filteredRows, filters, dept.name, false, false, dailyTayyor, orderSummary)
      const filename = `${dept.name}-${date}-${startTime.replace(':', '')}.pdf`
      const caption = `📊 ${dept.name} | ${date} | ${startTime}–${endTime}`
      // Shu bo'limning Telegram mavzusiga (forum topic) yuboriladi
      await sendHTMLToTelegram(html, filename, caption, threadForDept(dept))
      setTgMsg('✓ Yuborildi!')
    } catch (err) {
      setTgMsg('Xatolik: ' + err.message)
    } finally {
      setTgSending(false)
      setTimeout(() => setTgMsg(''), 4000)
    }
  }

  if (!dept) return <div className="text-red-500 p-4">Bo'lim topilmadi</div>
  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <div className="text-gray-700 font-semibold">Ruxsat yo'q</div>
      <div className="text-gray-400 text-sm mt-1">Bu bo'limga kirishingiz cheklanган</div>
    </div>
  )

  const allWorkersList = [...employees, ...guestEmps]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">{dept.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ish ma'lumotlarini kiritish</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        {activeShift && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Tez tanlash ({activeShift.name})</div>
            <div className="flex flex-wrap gap-2">
              {(activeShift.slots || []).map((slot, i) => {
                const isSelected = startTime === slot.startTime && endTime === slot.endTime
                return (
                  <button
                    key={i}
                    onClick={() => { setStartTime(slot.startTime); setEndTime(slot.endTime); setBreakMinutes(slot.breakMinutes || 0) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {slot.startTime}–{slot.endTime}
                    {slot.breakMinutes > 0 && <span className={`ml-1 ${isSelected ? 'text-indigo-200' : 'text-orange-400'}`}>⏸{slot.breakMinutes}'</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 sm:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Sana
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Boshlanish
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Tugash
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanaffus (daq.)</label>
            <input
              type="number"
              min="0"
              max="240"
              value={breakMinutes || ''}
              onChange={e => setBreakMinutes(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-full sm:w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 text-sm text-gray-500 sm:pb-2">
            <span className="font-semibold text-gray-700">{hours.toFixed(1)}</span> soat
            {breakMinutes > 0 && (
              <span className="text-xs text-orange-500 ml-1">(−{breakMinutes} daq.)</span>
            )}
          </div>
        </div>
      </div>

      {/* Employees */}
      {(!date || !startTime || !endTime) ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Sana, boshlanish va tugash vaqtini tanlang
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Bu bo'limda xodimlar mavjud emas
        </div>
      ) : (
        <>
          {/* Search + Guest + Save All */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Xodimni qidirish..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {can.enterHourly && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setShowGuestPicker(true); setGuestWarning('') }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Mehmon xodim
                </button>
                <div className="relative">
                  <button
                    onClick={handleSendTelegram}
                    disabled={tgSending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {tgSending ? 'Yuborilmoqda...' : 'Telegram'}
                  </button>
                  {tgMsg && (
                    <div className={`absolute bottom-full mb-1.5 left-0 whitespace-nowrap text-xs rounded-lg px-3 py-1.5 shadow-md ${
                      tgMsg.startsWith('✓') ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                    }`}>
                      {tgMsg}
                    </div>
                  )}
                </div>
                <button
                  onClick={saveAll}
                  disabled={savingAll}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    savedAll
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } disabled:opacity-60`}
                >
                  {savedAll ? (
                    <><CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">Hammasi </span>saqlandi</>
                  ) : (
                    <><Save className="w-4 h-4" /> {savingAll ? 'Saqlanmoqda...' : <><span className="hidden sm:inline">Barchasini </span>saqlash</>}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Umumiy buyurtma tanlash (hamma xodim uchun) */}
          {showOrderPicker && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-indigo-800 flex items-center gap-1.5 shrink-0">
                <Package className="w-4 h-4" /> Buyurtma:
              </span>
              <select
                value={defaultOrder}
                onChange={e => setDefaultOrder(e.target.value)}
                className="border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">Hech qaysi (buyurtmasiz)</option>
                <option value="auto">FIFO — avtomatik navbat</option>
                {visibleOrders.map(o => (
                  <option key={o.id} value={o.id}>{orderLabel(o)} ({Number(o.quantity).toLocaleString()} dona)</option>
                ))}
              </select>
              <span className="text-xs text-indigo-500">Har xodim va har operatsiya uchun pastda alohida o'zgartirsa bo'ladi</span>
            </div>
          )}

          <div className="space-y-4">
            {allWorkersList.filter(emp => {
              if (!search.trim()) return true
              const q = search.trim().toLowerCase()
              return `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q)
            }).map((emp, idx) => {
              const isGuest = guestEmps.some(e => e.id === emp.id)
              const activeOpIds = overrides[emp.id] ?? emp.operationIds ?? []
              const empOps = allOps.filter(o => activeOpIds.includes(o.id))
              const isOverridden = overrides[emp.id] != null && !isGuest
              const empEntries = entries[emp.id] || {}

              return (
                <div key={emp.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isGuest ? 'border-amber-200' : 'border-gray-100'}`}>
                  {/* Employee header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isGuest ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${isGuest ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-800 text-sm">
                        {emp.lastName} {emp.firstName}
                      </span>
                      {isGuest && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Mehmon · {departments.find(d => d.id === emp.departmentId)?.name}
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          Almashtrilgan
                        </span>
                      )}
                      {empTimes[emp.id] && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlarmClock className="w-3 h-3" />
                          {empTimes[emp.id].startTime}–{empTimes[emp.id].endTime}
                        </span>
                      )}
                      {showOrderPicker && (
                        <select
                          value={empOrders[emp.id] ?? defaultOrder}
                          onChange={e => setEmpOrderAll(emp.id, e.target.value)}
                          title="Barcha operatsiyalar uchun buyurtma (standart)"
                          className="text-xs border border-gray-200 bg-white rounded-full px-2 py-0.5 max-w-[150px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="none">📦 Hammasi: buyurtmasiz</option>
                          <option value="auto">📦 Hammasi: FIFO avto</option>
                          {visibleOrders.map(o => <option key={o.id} value={o.id}>📦 Hammasi: {orderLabel(o)}</option>)}
                        </select>
                      )}
                    </div>
                    {can.enterHourly && (
                      <div className="relative flex items-center gap-1">
                        {isGuest && (
                          <button
                            onClick={() => setRemovingGuestId(emp.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Mehmon xodimni olib tashlash"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setMenuEmp(menuEmp === emp.id ? null : emp.id)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuEmp === emp.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuEmp(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                              <button
                                onClick={() => { openPicker(emp); setMenuEmp(null) }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                                Operatsiya almashtirish
                              </button>
                              <button
                                onClick={() => { setTimePickerEmp(timePickerEmp === emp.id ? null : emp.id); setMenuEmp(null) }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                              >
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Vaqtni o'zgartirish
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Guest remove confirmation */}
                  {isGuest && removingGuestId === emp.id && (
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-red-700">
                        <span className="font-semibold">{emp.lastName} {emp.firstName}</span> ni olib tashlaysizmi?
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { removeGuest(emp.id); setRemovingGuestId(null) }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Tasdiqlash
                        </button>
                        <button
                          onClick={() => setRemovingGuestId(null)}
                          className="border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Operation picker */}
                  {pickerEmp === emp.id && (
                    <div className="border-b border-orange-100 bg-orange-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-orange-800">Operatsiyalarni tanlang (faqat shu sessiya uchun)</span>
                        <button onClick={() => { setPickerEmp(null); setPickerSearch('') }} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                          placeholder="Operatsiya qidirish..."
                          className="w-full border border-orange-200 bg-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {allOps.filter(o => o.departmentId === deptId).filter(o => !pickerSearch.trim() || o.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())).map(op => (
                          <label key={op.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                            pickerSel.includes(op.id)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          }`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={pickerSel.includes(op.id)}
                              onChange={() => togglePickerOp(op.id)}
                            />
                            {op.name}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => applyPicker(emp.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors"
                      >
                        Tasdiqlash
                      </button>
                    </div>
                  )}

                  {/* Per-employee time override */}
                  {timePickerEmp === emp.id && (
                    <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-indigo-800">Xodim uchun alohida vaqt</span>
                        <button onClick={() => setTimePickerEmp(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={empTimes[emp.id]?.startTime || startTime}
                          onChange={e => setEmpTimes(t => ({ ...t, [emp.id]: { ...t[emp.id], startTime: e.target.value, endTime: t[emp.id]?.endTime || endTime } }))}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-gray-400 text-sm">—</span>
                        <input
                          type="time"
                          value={empTimes[emp.id]?.endTime || endTime}
                          onChange={e => setEmpTimes(t => ({ ...t, [emp.id]: { ...t[emp.id], endTime: e.target.value, startTime: t[emp.id]?.startTime || startTime } }))}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => { setEmpTimes(t => { const n = { ...t }; delete n[emp.id]; return n }); setTimePickerEmp(null) }}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                        >
                          Bekor
                        </button>
                        <button
                          onClick={() => setTimePickerEmp(null)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
                        >
                          Tasdiqlash
                        </button>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1.5">
                        Ishlagan soat: {getEmpHours(emp.id).toFixed(1)} soat
                      </p>
                    </div>
                  )}

                  {/* Operations */}
                  {empOps.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-400">
                      Operatsiyalar tayinlanmagan
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {empOps.map(op => {
                        const qty = empEntries[op.id]?.quantity ?? ''
                        const note = empEntries[op.id]?.note ?? ''
                        const empH = getEmpHours(emp.id)
                        const norm = effectiveNorm(emp, op.id, op.norm || 0, date)
                        const expected = norm * empH
                        const status = normStatus(qty, norm, empH)

                        return (
                          <div key={op.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700">{op.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Norma: {norm} dona/soat{norm !== (op.norm || 0) ? ' (shaxsiy)' : ''} · {hours > 0 ? `${hours.toFixed(1)} soat = ` : ''}{hours > 0 ? `${expected.toFixed(0)} dona` : '—'}
                                </div>
                                {showOrderPicker && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                    <select
                                      value={opOrders[emp.id]?.[op.id] ?? empOrders[emp.id] ?? defaultOrder}
                                      onChange={e => setOpOrder(emp.id, op.id, e.target.value)}
                                      title="Bu operatsiya uchun buyurtma"
                                      className="text-xs border border-indigo-100 bg-indigo-50/60 text-indigo-800 rounded-full px-2 py-0.5 max-w-[170px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    >
                                      <option value="none">Buyurtmasiz</option>
                                      <option value="auto">FIFO avto</option>
                                      {visibleOrders.map(o => <option key={o.id} value={o.id}>{orderLabel(o)}</option>)}
                                    </select>
                                    <button
                                      onClick={() => addOpSplit(emp.id, op.id)}
                                      title="Shu operatsiyani boshqa buyurtmага bo'lish"
                                      className="flex items-center gap-0.5 text-xs text-indigo-600 hover:text-white hover:bg-indigo-500 border border-indigo-200 rounded-full px-1.5 py-0.5 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> buyurtma
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  value={qty}
                                  onChange={e => setEntryVal(emp.id, op.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                  disabled={!can.enterHourly}
                                  className={`w-24 border rounded-lg px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${statusStyle[status]}`}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-400">dona</span>
                              </div>
                              <input
                                type="text"
                                value={note}
                                onChange={e => setEntryVal(emp.id, op.id, 'note', e.target.value)}
                                disabled={!can.enterHourly}
                                className="w-full sm:w-40 md:w-52 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Izoh..."
                              />
                            </div>

                            {/* Qo'shimcha buyurtма qatorlari (shu operatsiyани boshqa buyurtmага) */}
                            {(opSplits[emp.id]?.[op.id] || []).map((line, li) => (
                              <div key={li} className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 pl-3 border-l-2 border-indigo-100">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-indigo-400 flex items-center gap-1">↳ {op.name} · yana bir buyurtма</div>
                                  {showOrderPicker && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <select
                                        value={line.orderId ?? 'auto'}
                                        onChange={e => setOpSplitVal(emp.id, op.id, li, 'orderId', e.target.value)}
                                        className="text-xs border border-indigo-100 bg-indigo-50/60 text-indigo-800 rounded-full px-2 py-0.5 max-w-[170px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                      >
                                        <option value="none">Buyurtmasiz</option>
                                        <option value="auto">FIFO avto</option>
                                        {visibleOrders.map(o => <option key={o.id} value={o.id}>{orderLabel(o)}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={line.quantity ?? ''}
                                    onChange={e => setOpSplitVal(emp.id, op.id, li, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={!can.enterHourly}
                                    className="w-24 border border-gray-200 rounded-lg px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-gray-400">dona</span>
                                </div>
                                <input
                                  type="text"
                                  value={line.note ?? ''}
                                  onChange={e => setOpSplitVal(emp.id, op.id, li, 'note', e.target.value)}
                                  disabled={!can.enterHourly}
                                  className="w-full sm:w-40 md:w-52 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Izoh..."
                                />
                                {can.enterHourly && (
                                  <button
                                    onClick={() => removeOpSplit(emp.id, op.id, li)}
                                    title="Bu qatorni olib tashlash"
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Save button per employee */}
                  {can.enterHourly && dirtyEmps[emp.id] && (
                    <div className="px-4 py-3 border-t border-gray-50 flex justify-end">
                      <button
                        onClick={() => saveEmployee(emp.id)}
                        disabled={saving[emp.id]}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-colors ${
                          saved[emp.id]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        } disabled:opacity-60`}
                      >
                        {saved[emp.id] ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved[emp.id] ? 'Saqlandi' : saving[emp.id] ? '...' : 'Saqlash'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Guest picker modal */}
      {showGuestPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 modal-enter">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">Mehmon xodim qo'shish</h3>
              <button onClick={() => { setShowGuestPicker(false); setGuestWarning(''); setGuestNotice('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Boshqa bo'limdagi xodim bu bo'limda vaqtinchalik ishlaydi</p>

            {guestWarning && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-xs">
                {guestWarning}
              </div>
            )}

            {guestNotice && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{guestNotice}</span>
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                placeholder="Xodim qidirish..."
                autoFocus
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {!pendingGuest ? (
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {allEmployees
                  .filter(e => e.departmentId !== deptId)
                  .filter(e => !guestEmps.some(g => g.id === e.id))
                  .filter(e => {
                    if (!guestSearch.trim()) return true
                    return `${e.lastName} ${e.firstName}`.toLowerCase().includes(guestSearch.toLowerCase())
                  })
                  .map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => selectPendingGuest(emp)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800">{emp.lastName} {emp.firstName}</div>
                        <div className="text-xs text-gray-400">{departments.find(d => d.id === emp.departmentId)?.name || "Bo'lim yo'q"}</div>
                      </div>
                    </button>
                  ))
                }
              </div>
            ) : (
              <div>
                <div className="bg-amber-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 text-sm font-bold shrink-0">
                    {pendingGuest.firstName?.[0]}{pendingGuest.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{pendingGuest.lastName} {pendingGuest.firstName}</div>
                    <div className="text-xs text-gray-400">{departments.find(d => d.id === pendingGuest.departmentId)?.name}</div>
                  </div>
                </div>

                <p className="text-xs font-medium text-gray-500 mb-2">Bajaradigan vazifasini tanlang:</p>
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 mb-4">
                  {allOps.filter(o => o.departmentId === deptId).map(op => (
                    <label key={op.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      pickerSel.includes(op.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                      <input type="checkbox" className="hidden" checked={pickerSel.includes(op.id)} onChange={() => togglePickerOp(op.id)} />
                      {op.name}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addGuestWithOps}
                    disabled={pickerSel.length === 0}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Qo'shish
                  </button>
                  <button
                    onClick={() => { setPendingGuest(null); setPickerSel([]) }}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                  >
                    Orqaga
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Empty employees confirmation modal */}
      {emptyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-enter">
            <h3 className="font-bold text-gray-800 mb-1">Kiritilmagan xodimlar</h3>
            <p className="text-sm text-gray-500 mb-4">
              Quyidagi {emptyWarning.length} ta xodim uchun miqdor yoki izoh kiritilmagan. Baribir saqlanadimi?
            </p>
            <ul className="mb-5 space-y-1 max-h-52 overflow-y-auto">
              {emptyWarning.map((emp, i) => (
                <li key={emp.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}.</span>
                  {emp.lastName} {emp.firstName}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setEmptyWarning(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => { setEmptyWarning(null); doSaveAll() }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Baribir saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Orders.jsx`

`````jsx
import { useEffect, useState, useRef } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy, getDocs, where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Package, Archive, RotateCcw, ChevronUp, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { computeOrderChain, forecastOrder } from '../utils/orderProgress'

const RULE_LABEL = { min: 'eng kam', sum: "yig'indi", mirror: 'nusxa' }

export default function Orders() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const canManage = can.manageOperations   // kirim qilish (admin yoki entry)
  const isAdmin = can.manageMembers         // tahrir / arxiv / o'chirish — faqat admin

  const [orders, setOrders] = useState([])
  const [filterStatus, setFilterStatus] = useState('active') // 'active' | 'archived'
  const [filterDept, setFilterDept] = useState('all') // 'all' | departmentId
  const [modal, setModal] = useState(null) // null | 'add' | {order}
  const [form, setForm] = useState({ name: '', quantity: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const reorderingRef = useRef(false)
  // Zanjir kartasi (progress)
  const [opById, setOpById] = useState({})
  const [expanded, setExpanded] = useState(null)   // ochilgan buyurtma id
  const [chains, setChains] = useState({})         // { orderId: hisoblangan natija }
  const [chainLoading, setChainLoading] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_orders'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Operatsiyalar (isFinal/isFirst) — bir marta
  useEffect(() => {
    getDocs(collection(db, 'factory_operations')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { const o = d.data(); map[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })
      setOpById(map)
    })
  }, [])

  const toggleExpand = async (order) => {
    if (expanded === order.id) { setExpanded(null); return }
    setExpanded(order.id)
    if (chains[order.id]) return // keshda bor
    setChainLoading(order.id)
    try {
      // Eski (entry.orderId) + yangi (op ichidagi orderId → entry.orderIds) yozuvlar; FIFO-avto ham
      const [s1, s2, a1, a2] = await Promise.all([
        getDocs(query(collection(db, 'factory_work_entries'), where('orderId', '==', order.id))),
        getDocs(query(collection(db, 'factory_work_entries'), where('orderIds', 'array-contains', order.id))),
        getDocs(query(collection(db, 'factory_work_entries'), where('orderId', '==', 'auto'))),
        getDocs(query(collection(db, 'factory_work_entries'), where('orderIds', 'array-contains', 'auto'))),
      ])
      const byDoc = new Map()
      ;[s1, s2, a1, a2].forEach(s => s.forEach(d => byDoc.set(d.id, d.data())))
      const entries = [...byDoc.values()]
      const result = computeOrderChain(order, entries, opById, departments, { allOrders: orders })
      setChains(c => ({ ...c, [order.id]: result }))
    } catch (e) {
      setChains(c => ({ ...c, [order.id]: { error: e.message } }))
    }
    setChainLoading(null)
  }

  const openAdd = () => {
    setForm({ name: '', quantity: '', departmentId: visibleDepts[0]?.id || '' })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (order) => {
    setForm({ name: order.name, quantity: order.quantity ?? '', departmentId: order.departmentId || '' })
    setSaveError('')
    setModal(order)
  }
  const closeModal = () => { setModal(null); setSaveError('') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.quantity || !form.departmentId) {
      setSaveError('Nomi, miqdor va bo\'lim kiritilishi shart')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const data = {
        name: form.name.trim(),
        quantity: Number(form.quantity),
        departmentId: form.departmentId,
      }
      if (modal === 'add') {
        // Navbat: eng katta order + 1 (oxiriga qo'shiladi — FIFO)
        const maxOrder = orders.reduce((m, o) => Math.max(m, o.order ?? 0), 0)
        await addDoc(collection(db, 'factory_orders'), {
          ...data,
          order: maxOrder + 1,
          status: 'active',   // holat: keyingi bosqichda avto hisoblanadi
          isActive: true,
          createdAt: serverTimestamp(),
        })
      } else {
        await updateDoc(doc(db, 'factory_orders', modal.id), data)
      }
      closeModal()
    } catch (err) {
      setSaveError(err.message || 'Xatolik yuz berdi')
    }
    setSaving(false)
  }

  const handleArchive = async (id) => {
    if (!confirm('Buyurtmani arxivlaysizmi?')) return
    await updateDoc(doc(db, 'factory_orders', id), { isActive: false })
  }
  const handleRestore = async (id) => {
    await updateDoc(doc(db, 'factory_orders', id), { isActive: true })
  }
  const handleDelete = async (id) => {
    if (!confirm('Buyurtmani butunlay o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_orders', id))
    setDeleting(null)
  }

  const reorder = async (order, dir) => {
    if (reorderingRef.current) return
    reorderingRef.current = true
    const list = orders
      .filter(o => o.isActive !== false)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const idx = list.findIndex(o => o.id === order.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) { reorderingRef.current = false; return }
    setReordering(order.id)
    await Promise.all(list.map((o, i) => {
      if (o.id === order.id) return updateDoc(doc(db, 'factory_orders', o.id), { order: swapIdx })
      if (i === swapIdx)     return updateDoc(doc(db, 'factory_orders', o.id), { order: idx })
      if (o.order == null)   return updateDoc(doc(db, 'factory_orders', o.id), { order: i })
      return Promise.resolve()
    }))
    setReordering(null)
    reorderingRef.current = false
  }

  // Foydalanuvchi faqat o'z bo'lim(lar)i buyurtmalarini ko'radi (admin — hammasini)
  const visibleDeptIds = new Set(visibleDepts.map(d => d.id))
  const ownOrders = orders.filter(o => visibleDeptIds.has(o.departmentId))

  const filtered = ownOrders
    .filter(o => filterStatus === 'active' ? o.isActive !== false : o.isActive === false)
    .filter(o => filterDept === 'all' ? true : o.departmentId === filterDept)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

  const activeCount = ownOrders.filter(o => o.isActive !== false).length
  const archivedCount = ownOrders.filter(o => o.isActive === false).length
  // Har bo'lim uchun buyurtma soni (chip yonida ko'rsatiladi)
  const deptCount = (dId) => ownOrders.filter(o =>
    (filterStatus === 'active' ? o.isActive !== false : o.isActive === false) && o.departmentId === dId
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-700" />
          <h1 className="text-xl font-bold text-gray-800">Buyurtmalar</h1>
        </div>
        {canManage && filterStatus === 'active' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Buyurtma qo'shish
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Faol ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Arxivlangan ({archivedCount})
        </button>
      </div>

      {/* Bo'lim bo'yicha filtr — har bo'lim o'z kirim qilgan buyurtmalarini ko'radi */}
      {visibleDepts.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterDept('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Barchasi
          </button>
          {visibleDepts.map(d => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d.name} ({deptCount(d.id)})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {filterStatus === 'archived' ? 'Arxivlangan buyurtmalar yo\'q' : 'Hozircha buyurtma yo\'q'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((order, i) => {
              const chain = chains[order.id]
              const isOpen = expanded === order.id
              return (
              <div key={order.id}>
              <div className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleExpand(order)} className="text-gray-400 hover:text-indigo-600 shrink-0" title="Zanjir kartasi">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <span className="text-xs text-gray-400 w-5 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(order)}>
                  <div className="text-sm font-medium text-gray-800">{order.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {Number(order.quantity).toLocaleString()} dona
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {getDeptName(order.departmentId)}
                    </span>
                    {chain && !chain.error ? (
                      chain.done
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✅ Bajarildi</span>
                        : <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Jarayonda {chain.percent}%</span>
                    ) : (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Jarayonda</span>
                    )}
                  </div>
                </div>

                {isAdmin && filterStatus === 'active' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {filterDept === 'all' && (
                      <div className="flex flex-col">
                        <button onClick={() => reorder(order, 'up')} disabled={reordering === order.id || i === 0} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => reorder(order, 'down')} disabled={reordering === order.id || i === filtered.length - 1} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                    )}
                    <button onClick={() => openEdit(order)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleArchive(order.id)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"><Archive className="w-4 h-4" /></button>
                  </div>
                )}
                {isAdmin && filterStatus === 'archived' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleRestore(order.id)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(order.id)} disabled={deleting === order.id} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-gray-50/70 border-t border-gray-100">
                  {chainLoading === order.id ? (
                    <div className="py-4 text-center text-xs text-gray-400">Hisoblanmoqda...</div>
                  ) : chain?.error ? (
                    <div className="py-4 text-center text-xs text-red-500">Xatolik: {chain.error}</div>
                  ) : chain ? (
                    <div className="pt-2">
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Tayyor mahsulot: <b className="text-gray-700">{chain.doneQty.toLocaleString()}</b> / {chain.orderQty.toLocaleString()}</span>
                          <span className={chain.done ? 'text-green-700 font-bold' : 'text-amber-700 font-semibold'}>{chain.percent}%{chain.done ? ' ✅' : ''}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${chain.done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(chain.percent, 100)}%` }} />
                        </div>
                        {(() => {
                          const f = forecastOrder(order, chain.doneQty)
                          if (!f || f.done) return null
                          return (
                            <div className="text-xs text-gray-500 mt-1.5">
                              📈 Taxminan: <b className="text-gray-700">{f.date}</b> ({f.daysLeft} kun · ~{f.rate.toLocaleString()} dona/kun)
                            </div>
                          )
                        })()}
                      </div>
                      {chain.depts.length === 0 ? (
                        <div className="text-xs text-gray-400 py-2">Bu buyurtma bo'yicha hali ish kiritilmagan</div>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.depts.map(d => (
                            <div key={d.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-700">
                                  {d.name}
                                  {d.rule !== 'order' && <span className="text-xs text-gray-400 ml-1">({RULE_LABEL[d.rule] || d.rule})</span>}
                                </span>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-blue-700">Kirim: <b>{d.kirim.toLocaleString()}</b></span>
                                  <span className="text-green-700">Chiqim: <b>{d.chiqim.toLocaleString()}</b></span>
                                  <span className={d.qoldiq > 0 ? 'text-amber-700' : 'text-gray-400'}>Qoldiq: <b>{d.qoldiq.toLocaleString()}</b></span>
                                </div>
                              </div>
                              {d.bottleneck && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Tiqilish: <b>{d.bottleneck.name}</b> ({d.bottleneck.qty.toLocaleString()}) — eng kam yetkazyapti
                                </div>
                              )}
                              {d.opBottleneck && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Operatsiya tiqilishi: <b>{d.opBottleneck.name}</b> ({d.opBottleneck.qty.toLocaleString()})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi buyurtma' : 'Buyurtmani tahrirlash'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-xs">{saveError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyurtma nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Ko'k ko'ylak"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Miqdor (dona)</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Tanlang —</option>
                  {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Bekor</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.quantity || !form.departmentId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Operations.jsx`

`````jsx
import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Star, Search, GripVertical, LogIn } from 'lucide-react'

export default function Operations() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const [operations, setOperations] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | {id, ...}
  const [form, setForm] = useState({ name: '', norm: '', unitPrice: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const [dragId, setDragId] = useState(null)       // sudralayotgan operatsiya
  const [dragOverId, setDragOverId] = useState(null) // ustiga kelingan operatsiya

  useEffect(() => {
    const q = query(collection(db, 'factory_operations'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openAdd = () => { setForm({ name: '', norm: '', unitPrice: '', departmentId: visibleDepts[0]?.id || '' }); setModal('add') }
  const openEdit = (op) => { setForm({ name: op.name, norm: op.norm, unitPrice: op.unitPrice ?? '', departmentId: op.departmentId }); setModal(op) }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim() || !form.norm || !form.departmentId) return
    setSaving(true)
    if (modal === 'add') {
      const maxOrder = operations
        .filter(o => o.departmentId === form.departmentId)
        .reduce((max, o) => Math.max(max, o.order ?? 0), 0)
      await addDoc(collection(db, 'factory_operations'), {
        name: form.name.trim(),
        norm: Number(form.norm),
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : 0,
        departmentId: form.departmentId,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'factory_operations', modal.id), {
        name: form.name.trim(),
        norm: Number(form.norm),
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : 0,
        departmentId: form.departmentId,
      })
    }
    setSaving(false)
    closeModal()
  }

  const handleToggleFinal = async (op) => {
    if (op.isFinal) {
      await updateDoc(doc(db, 'factory_operations', op.id), { isFinal: false })
    } else {
      const currentFinal = operations.find(o => o.departmentId === op.departmentId && o.isFinal && o.id !== op.id)
      if (currentFinal) {
        await updateDoc(doc(db, 'factory_operations', currentFinal.id), { isFinal: false })
      }
      await updateDoc(doc(db, 'factory_operations', op.id), { isFinal: true })
    }
  }

  // Boshlang'ich operatsiya — bo'limga kirimni ko'rsatadi (har bo'limda bitta)
  const handleToggleFirst = async (op) => {
    if (op.isFirst) {
      await updateDoc(doc(db, 'factory_operations', op.id), { isFirst: false })
    } else {
      const currentFirst = operations.find(o => o.departmentId === op.departmentId && o.isFirst && o.id !== op.id)
      if (currentFirst) {
        await updateDoc(doc(db, 'factory_operations', currentFirst.id), { isFirst: false })
      }
      await updateDoc(doc(db, 'factory_operations', op.id), { isFirst: true })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_operations', id))
    setDeleting(null)
  }

  // Operatsiyaning bo'lim ichidagi joriy o'rni (1 dan boshlab)
  const posInDept = (op) => operations
    .filter(o => o.departmentId === op.departmentId)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .findIndex(o => o.id === op.id) + 1

  // Raqam yozib tartiblash — operatsiyani berilgan o'ringa (1..n) ko'chiradi
  const reorderByNumber = async (opId, newPos) => {
    const src = operations.find(o => o.id === opId)
    if (!src || !newPos) return
    const list = operations
      .filter(o => o.departmentId === src.departmentId)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const clamped = Math.max(1, Math.min(list.length, newPos))
    const next = list.filter(o => o.id !== opId)
    next.splice(clamped - 1, 0, src)
    setReordering(opId)
    await Promise.all(next.map((o, i) =>
      (o.order !== i) ? updateDoc(doc(db, 'factory_operations', o.id), { order: i }) : Promise.resolve()
    ))
    setReordering(null)
  }

  // Sudrab tashlab tartiblash — faqat shu bo'lim ichida. Operatsiyani nishon
  // operatsiyaning oldiga joylab, bo'limning butun ro'yxatiga 0..n tartib beriladi.
  const reorderByDrag = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    const src = operations.find(o => o.id === sourceId)
    const tgt = operations.find(o => o.id === targetId)
    if (!src || !tgt || src.departmentId !== tgt.departmentId) return // boshqa bo'limга emas
    const list = operations
      .filter(o => o.departmentId === src.departmentId)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const next = list.filter(o => o.id !== sourceId)
    const insertAt = next.findIndex(o => o.id === targetId)
    next.splice(insertAt, 0, src)
    setReordering(sourceId)
    await Promise.all(next.map((o, i) =>
      (o.order !== i) ? updateDoc(doc(db, 'factory_operations', o.id), { order: i }) : Promise.resolve()
    ))
    setReordering(null)
  }

  const visibleOpIds = new Set(visibleDepts.map(d => d.id))
  const visibleOps = operations
    .filter(o => visibleOpIds.has(o.departmentId))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
  const filtered = visibleOps
    .filter(o => filterDept === 'all' || o.departmentId === filterDept)
    .filter(o => !search.trim() || o.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Operatsiyalar</h1>
        {can.manageOperations && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Operatsiya nomini qidiring..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi
        </button>
        {visibleDepts.map(d => (
          <button
            key={d.id}
            onClick={() => setFilterDept(d.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {can.manageOperations && filtered.length > 1 && !search.trim() && (
        <p className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <GripVertical className="w-3.5 h-3.5" /> Operatsiyani sudrab yoki tartib raqamini yozib joyini o'zgartiring
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Operatsiyalar topilmadi
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(op => (
                <div key={op.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{op.name}</span>
                        {op.isFirst && <LogIn className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                        {op.isFinal && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full mt-1 inline-block">
                        {getDeptName(op.departmentId)}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {op.norm} dona/soat{op.unitPrice ? ` · ${op.unitPrice.toLocaleString()} so'm` : ''}
                      </div>
                    </div>
                    {can.manageOperations && (
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="1"
                          key={`mpos-${op.id}-${posInDept(op)}`}
                          defaultValue={posInDept(op)}
                          disabled={reordering === op.id}
                          title="Tartib raqami"
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                          onBlur={e => { const v = parseInt(e.target.value, 10); if (v && v !== posInDept(op)) reorderByNumber(op.id, v) }}
                          className="w-10 border border-gray-200 rounded-md px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button onClick={() => openEdit(op)} className="p-2 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiya nomi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Norma (1 soat)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Dona narxi (so'm)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Yakuniy</th>
                    {can.manageOperations && <th className="px-4 py-3 w-24 text-center font-medium text-gray-600">Tartib</th>}
                    {can.manageOperations && <th className="px-4 py-3 w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(op => {
                    const canDrag = can.manageOperations && !search.trim()
                    const isDragging = dragId === op.id
                    const isDragOver = dragOverId === op.id && dragId && dragId !== op.id
                    return (
                    <tr
                      key={op.id}
                      draggable={canDrag}
                      onDragStart={() => canDrag && setDragId(op.id)}
                      onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                      onDragOver={e => { if (dragId) { e.preventDefault(); setDragOverId(op.id) } }}
                      onDrop={e => { e.preventDefault(); reorderByDrag(dragId, op.id); setDragId(null); setDragOverId(null) }}
                      className={`hover:bg-gray-50 ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-t-2 border-indigo-500' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{op.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{getDeptName(op.departmentId)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{op.norm} dona</td>
                      <td className="px-4 py-3 text-gray-600">{op.unitPrice ? `${op.unitPrice.toLocaleString()} so'm` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => can.manageOperations && handleToggleFirst(op)}
                            disabled={!can.manageOperations}
                            title="Boshlang'ich operatsiya (kirim)"
                            className={`flex items-center gap-1.5 text-xs transition-colors ${op.isFirst ? 'text-green-600' : can.manageOperations ? 'text-gray-300 hover:text-green-400' : 'text-gray-200 cursor-default'}`}
                          >
                            <LogIn className={`w-4 h-4 ${op.isFirst ? 'text-green-600' : ''}`} />
                            {op.isFirst && <span className="font-medium">Boshlang'ich</span>}
                          </button>
                          <button
                            onClick={() => can.manageOperations && handleToggleFinal(op)}
                            disabled={!can.manageOperations}
                            title="Yakuniy operatsiya (tayyor mahsulot)"
                            className={`flex items-center gap-1.5 text-xs transition-colors ${op.isFinal ? 'text-amber-600' : can.manageOperations ? 'text-gray-300 hover:text-amber-400' : 'text-gray-200 cursor-default'}`}
                          >
                            <Star className={`w-4 h-4 ${op.isFinal ? 'fill-amber-500 text-amber-500' : ''}`} />
                            {op.isFinal && <span className="font-medium">Yakuniy</span>}
                          </button>
                        </div>
                      </td>
                      {can.manageOperations && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              key={`pos-${op.id}-${posInDept(op)}`}
                              defaultValue={posInDept(op)}
                              disabled={reordering === op.id}
                              title="Tartib raqami — yozib joyini o'zgartiring"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                              onBlur={e => { const v = parseInt(e.target.value, 10); if (v && v !== posInDept(op)) reorderByNumber(op.id, v) }}
                              className="w-11 border border-gray-200 rounded-md px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span
                              title={search.trim() ? "Tartiblash uchun qidiruvni tozalang" : "Sudrab tartiblang"}
                              className={`${search.trim() ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing'}`}
                            >
                              <GripVertical className="w-5 h-5" />
                            </span>
                          </div>
                        </td>
                      )}
                      {can.manageOperations && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(op)} className="text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id} className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi operatsiya' : 'Operatsiyani tahrirlash'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Operatsiya nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Ko'ylak tikish"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {visibleDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  1 soatdagi norma (dona)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.norm}
                  onChange={e => setForm(f => ({ ...f, norm: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dona narxi (so'm) — <span className="text-gray-400 font-normal">akkord uchun</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="150"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.norm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Employees.jsx`

`````jsx
import { useEffect, useState, useRef } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Search, Archive, RotateCcw, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Employees() {
  const navigate = useNavigate()
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', departmentId: '', operationIds: [], salaryType: 'hourly', hourlyRate: '', salaryHistory: [], telegramId: '', customNorms: {} })
  const [normInputs, setNormInputs] = useState({}) // { opId: '45' } — tahrirlash uchun joriy shaxsiy norma
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [search, setSearch] = useState('')
  const [opSearch, setOpSearch] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), orderBy('lastName'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    getDocs(query(collection(db, 'factory_operations'), orderBy('name')))
      .then(snap => setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const deptOps = allOps.filter(o => o.departmentId === form.departmentId)

  const openAdd = () => {
    setForm({ firstName: '', lastName: '', departmentId: visibleDepts[0]?.id || '', operationIds: [], salaryType: 'hourly', hourlyRate: '', salaryHistory: [], telegramId: '', customNorms: {} })
    setNormInputs({})
    setOpSearch('')
    setSaveError('')
    setModal('add')
  }
  const openEdit = (emp) => {
    const customNorms = emp.customNorms || {}
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: emp.departmentId,
      operationIds: emp.operationIds || [],
      salaryType: emp.salaryType || 'hourly',
      hourlyRate: emp.hourlyRate ?? '',
      salaryHistory: emp.salaryHistory || [],
      telegramId: emp.telegramId || '',
      customNorms,
    })
    // Har operatsiya uchun joriy (oxirgi) shaxsiy normani inputga qo'yamiz
    const ni = {}
    Object.entries(customNorms).forEach(([opId, hist]) => {
      if (Array.isArray(hist) && hist.length) ni[opId] = String(hist[hist.length - 1].norm)
    })
    setNormInputs(ni)
    setOpSearch('')
    setSaveError('')
    setModal(emp)
  }

  const toggleOp = (id) => {
    setForm(f => ({
      ...f,
      operationIds: f.operationIds.includes(id)
        ? f.operationIds.filter(x => x !== id)
        : [...f.operationIds, id],
    }))
  }

  const handleDeptChange = (deptId) => {
    setForm(f => ({ ...f, departmentId: deptId, operationIds: [] }))
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.departmentId) return
    setSaving(true)
    setSaveError('')
    try {
      const newRate = form.hourlyRate !== '' ? Number(form.hourlyRate) : null
      const today = new Date().toISOString().slice(0, 10)
      const prevHistory = form.salaryHistory || []
      const lastEntry = prevHistory[prevHistory.length - 1]
      const salaryHistory = newRate !== null && (!lastEntry || lastEntry.hourlyRate !== newRate)
        ? [...prevHistory, { hourlyRate: newRate, from: today }]
        : prevHistory

      // Shaxsiy norma tarixi: input o'zgargan bo'lsa, shu sanadan yangi yozuv qo'shamiz
      const customNorms = { ...(form.customNorms || {}) }
      form.operationIds.forEach(opId => {
        const raw = normInputs[opId]
        if (raw === undefined || raw === '') return          // bo'sh = umumiy norma (o'zgartirmaymiz)
        const val = Number(raw)
        if (!Number.isFinite(val) || val <= 0) return
        const hist = customNorms[opId] || []
        const last = hist[hist.length - 1]
        if (!last || last.norm !== val) {
          customNorms[opId] = [...hist, { norm: val, from: today }]
        }
      })

      const data = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        departmentId: form.departmentId,
        operationIds: form.operationIds,
        salaryType: form.salaryType,
        hourlyRate: newRate,
        salaryHistory,
        customNorms,
        telegramId: form.telegramId.trim() || null,
      }
      if (modal === 'add') {
        const maxOrder = employees
          .filter(e => e.departmentId === form.departmentId)
          .reduce((max, e) => Math.max(max, e.order ?? 0), 0)
        await addDoc(collection(db, 'factory_employees'), { ...data, isActive: true, order: maxOrder + 1, createdAt: serverTimestamp() })
      } else {
        await updateDoc(doc(db, 'factory_employees', modal.id), data)
      }
      setSaving(false)
      setModal(null)
    } catch (err) {
      setSaving(false)
      setSaveError(err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.')
    }
  }

  const handleArchive = async (id) => {
    if (!confirm('Xodimni arxivlaysizmi? DepartmentWork va Davomatda ko\'rinmay qoladi.')) return
    await updateDoc(doc(db, 'factory_employees', id), { isActive: false })
  }

  const handleRestore = async (id) => {
    await updateDoc(doc(db, 'factory_employees', id), { isActive: true })
  }

  const handleDelete = async (id) => {
    if (!confirm('Xodimni butunlay o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_employees', id))
    setDeleting(null)
  }

  // Xodimning bo'lim ichidagi joriy o'rni (1 dan boshlab)
  const deptSorted = (deptId) => employees
    .filter(e => e.departmentId === deptId && e.isActive !== false)
    .sort((a, b) => {
      const aO = a.order ?? Infinity, bO = b.order ?? Infinity
      if (aO !== bO) return aO - bO
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
    })
  const posInDept = (emp) => deptSorted(emp.departmentId).findIndex(e => e.id === emp.id) + 1

  // Raqam yozib tartiblash — xodimni berilgan o'ringa (1..n) ko'chiradi
  const reorderByNumber = async (empId, newPos) => {
    const src = employees.find(e => e.id === empId)
    if (!src || !newPos) return
    const list = deptSorted(src.departmentId)
    const clamped = Math.max(1, Math.min(list.length, newPos))
    const next = list.filter(e => e.id !== empId)
    next.splice(clamped - 1, 0, src)
    setReordering(empId)
    await Promise.all(next.map((e, i) =>
      (e.order !== i) ? updateDoc(doc(db, 'factory_employees', e.id), { order: i }) : Promise.resolve()
    ))
    setReordering(null)
  }

  // Sudrab tashlab tartiblash — faqat shu bo'lim ichida
  const reorderByDrag = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    const src = employees.find(e => e.id === sourceId)
    const tgt = employees.find(e => e.id === targetId)
    if (!src || !tgt || src.departmentId !== tgt.departmentId) return
    const list = employees
      .filter(e => e.departmentId === src.departmentId && e.isActive !== false)
      .sort((a, b) => {
        const aO = a.order ?? Infinity, bO = b.order ?? Infinity
        if (aO !== bO) return aO - bO
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
      })
    const next = list.filter(e => e.id !== sourceId)
    const insertAt = next.findIndex(e => e.id === targetId)
    next.splice(insertAt, 0, src)
    setReordering(sourceId)
    await Promise.all(next.map((e, i) =>
      (e.order !== i) ? updateDoc(doc(db, 'factory_employees', e.id), { order: i }) : Promise.resolve()
    ))
    setReordering(null)
  }

  const visibleDeptIds = new Set(visibleDepts.map(d => d.id))

  const byStatus = (e) => filterStatus === 'active' ? e.isActive !== false : e.isActive === false

  const filtered = employees
    .filter(e => visibleDeptIds.has(e.departmentId))
    .filter(byStatus)
    .filter(e => filterDept === 'all' || e.departmentId === filterDept)
    .filter(e => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return `${e.lastName} ${e.firstName}`.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (filterDept === 'all' && a.departmentId !== b.departmentId)
        return getDeptName(a.departmentId).localeCompare(getDeptName(b.departmentId), 'uz')
      const aO = a.order ?? Infinity
      const bO = b.order ?? Infinity
      if (aO !== bO) return aO - bO
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
    })

  const activeCount = employees.filter(e => visibleDeptIds.has(e.departmentId) && e.isActive !== false).length
  const archivedCount = employees.filter(e => visibleDeptIds.has(e.departmentId) && e.isActive === false).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Xodimlar</h1>
        {can.manageEmployees && filterStatus === 'active' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Faol ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Arxivlangan ({archivedCount})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Xodimni qidirish (ism yoki familya)..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Dept filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi
        </button>
        {visibleDepts.map(d => {
          const count = employees.filter(e => e.departmentId === d.id && byStatus(e)).length
          return (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d.name} ({count})
            </button>
          )
        })}
      </div>

      {can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && !search.trim() && filtered.length > 1 && (
        <p className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <GripVertical className="w-3.5 h-3.5" /> Xodimni sudrab yoki tartib raqamini yozib joyini o'zgartiring
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {filterStatus === 'archived' ? 'Arxivlangan xodimlar yo\'q' : 'Xodimlar topilmadi'}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map((emp) => {
                const empOps = allOps.filter(o => emp.operationIds?.includes(o.id))
                return (
                  <div key={emp.id} className={`px-4 py-3 ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/employee/${emp.id}`)}>
                        <div className="text-sm font-medium text-gray-800 hover:text-indigo-700">{emp.lastName} {emp.firstName}</div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full mt-1 inline-block">
                          {getDeptName(emp.departmentId)}
                        </span>
                        {empOps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {empOps.map(op => (
                              <span key={op.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{op.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {can.manageEmployees && (
                        <div className="flex items-center gap-1 shrink-0">
                          {filterDept !== 'all' && filterStatus === 'active' && (
                            <input
                              type="number"
                              min="1"
                              key={`mpos-${emp.id}-${posInDept(emp)}`}
                              defaultValue={posInDept(emp)}
                              disabled={reordering === emp.id}
                              title="Tartib raqami"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                              onBlur={e => { const v = parseInt(e.target.value, 10); if (v && v !== posInDept(emp)) reorderByNumber(emp.id, v) }}
                              className="w-10 border border-gray-200 rounded-md px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          )}
                          {filterStatus === 'active' ? (
                            <>
                              <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="p-2 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleArchive(emp.id) }} className="p-2 text-gray-400 hover:text-amber-600"><Archive className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={e => { e.stopPropagation(); handleRestore(emp.id) }} className="p-2 text-gray-400 hover:text-green-600"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(emp.id) }} disabled={deleting === emp.id} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ismi Familyasi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiyalar</th>
                    {can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && <th className="px-4 py-3 w-20 text-center font-medium text-gray-600">Tartib</th>}
                    {can.manageEmployees && <th className="px-4 py-3 w-24" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((emp, i) => {
                    const empOps = allOps.filter(o => emp.operationIds?.includes(o.id))
                    const canDrag = can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && !search.trim()
                    const isDragging = dragId === emp.id
                    const isDragOver = dragOverId === emp.id && dragId && dragId !== emp.id
                    return (
                      <tr
                        key={emp.id}
                        draggable={canDrag}
                        onDragStart={() => canDrag && setDragId(emp.id)}
                        onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                        onDragOver={e => { if (dragId) { e.preventDefault(); setDragOverId(emp.id) } }}
                        onDrop={e => { e.preventDefault(); reorderByDrag(dragId, emp.id); setDragId(null); setDragOverId(null) }}
                        onClick={() => navigate(`/employee/${emp.id}`)}
                        className={`hover:bg-gray-50 cursor-pointer ${filterStatus === 'archived' ? 'opacity-60' : ''} ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-t-2 border-indigo-500' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 hover:text-indigo-700">{emp.lastName} {emp.firstName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{getDeptName(emp.departmentId)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {empOps.length === 0 ? (
                              <span className="text-gray-400 text-xs">Tayinlanmagan</span>
                            ) : empOps.map(op => (
                              <span key={op.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{op.name}</span>
                            ))}
                          </div>
                        </td>
                        {can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                key={`pos-${emp.id}-${posInDept(emp)}`}
                                defaultValue={posInDept(emp)}
                                disabled={reordering === emp.id}
                                title="Tartib raqami — yozib joyini o'zgartiring"
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                onBlur={e => { const v = parseInt(e.target.value, 10); if (v && v !== posInDept(emp)) reorderByNumber(emp.id, v) }}
                                className="w-11 border border-gray-200 rounded-md px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span
                                title={search.trim() ? "Tartiblash uchun qidiruvni tozalang" : "Sudrab tartiblang"}
                                className={`${search.trim() ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing'}`}
                              >
                                <GripVertical className="w-5 h-5" />
                              </span>
                            </div>
                          </td>
                        )}
                        {can.manageEmployees && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              {filterStatus === 'active' ? (
                                <>
                                  <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={e => { e.stopPropagation(); handleArchive(emp.id) }} className="text-gray-400 hover:text-amber-600 transition-colors"><Archive className="w-4 h-4" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={e => { e.stopPropagation(); handleRestore(emp.id) }} className="text-gray-400 hover:text-green-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                                  <button onClick={e => { e.stopPropagation(); handleDelete(emp.id) }} disabled={deleting === emp.id} className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi xodim' : 'Xodimni tahrirlash'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Familyasi</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Karimov"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ali"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => handleDeptChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {visibleDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operatsiyalar ({deptOps.length} ta)
                </label>
                {deptOps.length === 0 ? (
                  <p className="text-xs text-gray-400">Bu bo'limda operatsiyalar mavjud emas</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Operatsiya qidirish..."
                        value={opSearch}
                        onChange={e => setOpSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {deptOps.filter(op => op.name.toLowerCase().includes(opSearch.toLowerCase())).map(op => (
                        <label key={op.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={form.operationIds.includes(op.id)}
                            onChange={() => toggleOp(op.id)}
                            className="accent-indigo-600"
                          />
                          <span className="text-sm text-gray-700 flex-1">{op.name}</span>
                          <span className="text-xs text-gray-400">{op.norm} dona/soat</span>
                        </label>
                      ))}
                      {deptOps.filter(op => op.name.toLowerCase().includes(opSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Topilmadi</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Shaxsiy normalar */}
              {form.operationIds.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shaxsiy normalar
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Bo'sh = umumiy norma. Kiritilса, o'zgartirilган sanadan boshlab amal qiladi.
                  </p>
                  <div className="space-y-2.5">
                    {deptOps.filter(op => form.operationIds.includes(op.id)).map(op => {
                      const hist = form.customNorms?.[op.id] || []
                      return (
                        <div key={op.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 flex-1 truncate">{op.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">umumiy: {op.norm}</span>
                            <input
                              type="number"
                              min="0"
                              value={normInputs[op.id] ?? ''}
                              onChange={e => setNormInputs(n => ({ ...n, [op.id]: e.target.value }))}
                              placeholder={String(op.norm)}
                              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                            />
                          </div>
                          {hist.length > 0 && (
                            <div className="mt-1 pl-2 space-y-0.5">
                              {[...hist].reverse().map((h, i) => (
                                <div key={i} className="flex justify-between text-[11px] text-gray-400">
                                  <span>{h.from} dan</span>
                                  <span>{h.norm} dona/soat</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Telegram ID */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram ID — <span className="text-gray-400 font-normal">xabar yuborish uchun</span>
                </label>
                <input
                  type="text"
                  value={form.telegramId}
                  onChange={e => setForm(f => ({ ...f, telegramId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="590319878"
                />
                <p className="text-xs text-gray-400 mt-1">Xodim @KAFTIMDA_ERP botga /start yozib ID sini oladi</p>
              </div>

              {/* Maosh bo'limi */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Maosh turi</label>
                <select
                  value={form.salaryType}
                  onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                >
                  <option value="hourly">Soatlik</option>
                  <option value="piece">Akkord (dona uchun)</option>
                  <option value="both">Aralash (soatlik + akkord)</option>
                </select>

                {(form.salaryType === 'hourly' || form.salaryType === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Soatlik stavka (so'm)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.hourlyRate}
                      onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                )}

                {form.salaryHistory?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1.5">Maosh tarixi:</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {[...form.salaryHistory].reverse().map((h, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                          <span>{h.from}</span>
                          <span>{h.hourlyRate?.toLocaleString()} so'm/soat</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {saveError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.firstName.trim() || !form.lastName.trim() || !form.departmentId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/EmployeeCard.jsx`

`````jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { ArrowLeft, Calendar } from 'lucide-react'

function calcHours(start, end, breakMinutes) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const raw = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  return Math.max(0, raw - (breakMinutes || 0) / 60)
}

const ABSENCE_LABEL = { kasallik: 'Kasallik', tatil: "Ta'til", sababsiz: 'Sababsiz', boshqa: 'Boshqa' }
const ABSENCE_BADGE = {
  kasallik: 'bg-indigo-100 text-indigo-700',
  tatil: 'bg-purple-100 text-purple-700',
  sababsiz: 'bg-red-100 text-red-700',
  boshqa: 'bg-gray-100 text-gray-600',
}

export default function EmployeeCard() {
  const { empId } = useParams()
  const navigate = useNavigate()
  const { getDeptName } = useDepartments()

  const [emp, setEmp] = useState(null)
  const [allOps, setAllOps] = useState([])
  const [workEntries, setWorkEntries] = useState([])
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    getDoc(doc(db, 'factory_employees', empId)).then(d => {
      if (d.exists()) setEmp({ id: d.id, ...d.data() })
    })
    getDocs(collection(db, 'factory_operations')).then(snap => {
      setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [empId])

  useEffect(() => {
    if (!month) return
    setLoading(true)
    const monthStart = `${month}-01`
    const monthEnd = `${month}-31`
    Promise.all([
      getDocs(query(
        collection(db, 'factory_work_entries'),
        where('employeeId', '==', empId),
      )),
      getDocs(query(
        collection(db, 'factory_absences'),
        where('employeeId', '==', empId),
      )),
    ]).then(([wSnap, aSnap]) => {
      const inMonth = d => d.date >= monthStart && d.date <= monthEnd
      setWorkEntries(wSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(inMonth))
      setAbsences(aSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(inMonth))
      setLoading(false)
    })
  }, [empId, month])

  const totalHours = workEntries.reduce((s, e) => s + calcHours(e.startTime, e.endTime, e.breakMinutes), 0)
  const uniqueDays = new Set(workEntries.map(e => e.date)).size
  const totalPay = workEntries.reduce((s, e) => s + (Number(e.totalPay) || 0), 0)

  const opsSummary = {}
  workEntries.forEach(entry => {
    Object.entries(entry.operations || {}).forEach(([opId, val]) => {
      if (!opsSummary[opId]) opsSummary[opId] = { quantity: 0, piecePay: 0, expected: 0 }
      opsSummary[opId].quantity += Number(val.quantity || 0)
      opsSummary[opId].piecePay += Number(val.piecePay || 0)
      opsSummary[opId].expected += Number(val.expected || 0)
    })
  })

  const salaryTypeLabel = { piece: 'Donabay', mixed: 'Aralash', hourly: 'Soatbay' }[emp?.salaryType] || 'Soatbay'

  if (!emp) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{emp.lastName} {emp.firstName}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{getDeptName(emp.departmentId)}</span>
            <span className="text-xs text-gray-400">{salaryTypeLabel}</span>
            {emp.hourlyRate ? <span className="text-xs text-gray-400">{Number(emp.hourlyRate).toLocaleString()} so'm/soat</span> : null}
          </div>
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-700">{uniqueDays}</div>
              <div className="text-xs text-indigo-500 mt-1">Kun ishladi</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-purple-500 mt-1">Jami soat</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{absences.length}</div>
              <div className="text-xs text-red-500 mt-1">Kelmagan kun</div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-green-700 leading-tight">{totalPay.toLocaleString()}</div>
              <div className="text-xs text-green-500 mt-1">Maosh (so'm)</div>
            </div>
          </div>

          {/* Operations */}
          {Object.keys(opsSummary).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-800">Operatsiyalar</div>
              <div className="divide-y divide-gray-50">
                {Object.entries(opsSummary).map(([opId, stat]) => {
                  const op = allOps.find(o => o.id === opId)
                  const pct = stat.expected > 0 ? Math.round(stat.quantity / stat.expected * 100) : null
                  return (
                    <div key={opId} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{op?.name || opId}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{stat.quantity} dona</div>
                      </div>
                      <div className="text-right shrink-0">
                        {pct !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {pct}% norma
                          </span>
                        )}
                        {stat.piecePay > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">{stat.piecePay.toLocaleString()} so'm</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Absences */}
          {absences.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-800">Kelmaganlar</div>
              <div className="divide-y divide-gray-50">
                {[...absences].sort((a, b) => a.date.localeCompare(b.date)).map(abs => (
                  <div key={abs.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">{abs.date}</div>
                    <div className="flex items-center gap-2">
                      {abs.reason && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ABSENCE_BADGE[abs.reason] || 'bg-gray-100 text-gray-600'}`}>
                          {ABSENCE_LABEL[abs.reason] || abs.reason}
                        </span>
                      )}
                      {abs.note && <span className="text-xs text-gray-400 truncate max-w-[100px]">{abs.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workEntries.length === 0 && absences.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              Bu oyda ma'lumot topilmadi
            </div>
          )}
        </>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Departments.jsx`

`````jsx
import { useState } from 'react'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react'

export default function Departments() {
  const { departments, addDept, updateDept, deleteDept } = useDepartments()
  const { can } = useAuth()
  const [modal, setModal] = useState(null) // null | 'add' | { id, name }
  const [name, setName] = useState('')
  const [threadId, setThreadId] = useState('')
  const [chainMode, setChainMode] = useState('order')   // 'order' = buyurtmadan | 'from' = boshqa bo'limlardan
  const [chainSources, setChainSources] = useState([])   // manba bo'lim id'lari
  const [chainRule, setChainRule] = useState('min')      // 'mirror' | 'min' | 'sum'
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  const openAdd = () => {
    setName(''); setThreadId(''); setChainMode('order'); setChainSources([]); setChainRule('min')
    setError(''); setModal('add')
  }
  const openEdit = (dept) => {
    setName(dept.name)
    setThreadId(dept.telegramThreadId ?? '')
    const ci = dept.chainInput || {}
    setChainMode(ci.mode || 'order')
    setChainSources(ci.sources || [])
    setChainRule(ci.rule || 'min')
    setError('')
    setModal(dept)
  }
  const closeModal = () => { setModal(null); setError('') }

  const toggleSource = (id) => {
    setChainSources(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const handleSave = async () => {
    if (!name.trim()) { setError("Bo'lim nomi kiritilmadi"); return }
    if (modal !== 'add' && chainMode === 'from' && chainSources.length === 0) {
      setError('Kirim manbai bo\'lim(lar)ini tanlang')
      return
    }
    setSaving(true)
    try {
      if (modal === 'add') {
        await addDept(name)
      } else {
        const chainInput = chainMode === 'from'
          ? { mode: 'from', sources: chainSources.filter(id => id !== modal.id), rule: chainRule }
          : { mode: 'order' }
        await updateDept(modal.id, {
          name: name.trim(),
          telegramThreadId: threadId.trim() === '' ? null : Number(threadId.trim()),
          chainInput,
        })
      }
      closeModal()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (dept) => {
    if (!confirm(`"${dept.name}" ni o'chirishni tasdiqlaysizmi?`)) return
    setDeleting(dept.id)
    await deleteDept(dept.id)
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Bo'limlar</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Bo'lim qo'shish
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Bo'limlar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {departments.map((dept, i) => (
              <div key={dept.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{dept.name}</div>
                </div>
                {can.manageMembers && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(dept)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      disabled={deleting === dept.id}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi bo'lim" : "Bo'limni tahrirlash"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim nomi</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Masalan: Tikuv bo'limi"
                autoFocus
              />
            </div>

            {modal !== 'add' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram mavzu ID <span className="text-gray-400 font-normal">— ixtiyoriy</span>
                </label>
                <input
                  type="number"
                  value={threadId}
                  onChange={e => setThreadId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: 1015"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Hisobot shu mavzuga boradi. Mavzu havolasidagi oxirgi raqam (t.me/c/.../<b>1015</b>). Bo'sh = asosiy guruh.
                </p>
              </div>
            )}

            {modal !== 'add' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Zanjir — kirim manbai</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="chainMode" checked={chainMode === 'order'} onChange={() => setChainMode('order')} className="accent-indigo-600" />
                    Buyurtmadan (mustaqil) — masalan Kamzul, Shim, Tana
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="chainMode" checked={chainMode === 'from'} onChange={() => setChainMode('from')} className="accent-indigo-600" />
                    Boshqa bo'lim(lar)dan
                  </label>
                </div>

                {chainMode === 'from' && (
                  <div className="mt-3 pl-1 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Manba bo'lim(lar):</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2">
                        {departments.filter(d => d.id !== modal.id).map(d => (
                          <label key={d.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 py-0.5">
                            <input type="checkbox" checked={chainSources.includes(d.id)} onChange={() => toggleSource(d.id)} className="accent-indigo-600" />
                            {d.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Qoida:</p>
                      <select
                        value={chainRule}
                        onChange={e => setChainRule(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="mirror">Nusxa (manba kirimi bilan bir xil — tarqalish, masalan Astar, Yeng)</option>
                        <option value="min">Eng kam (manbalar chiqimi minimumi — masalan Montaj)</option>
                        <option value="sum">Yig'indi (manbalar chiqimi yig'indisi)</option>
                      </select>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">Buyurtma miqdori shu qoida bo'yicha bo'limlar bo'ylab tarqaladi.</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Attendance.jsx`

`````jsx
import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  setDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, UserX, UserCheck, FileText, Download, Send } from 'lucide-react'
import { exportAttendancePDF, buildAttendancePDFHtml } from '../utils/pdf'
import { exportAttendanceExcel } from '../utils/excel'
import { sendHTMLToTelegram } from '../utils/telegram'

const REASONS = [
  { value: 'kasallik', label: 'Kasallik',  badge: 'bg-indigo-100 text-indigo-700'   },
  { value: 'tatil',    label: "Ta'til",    badge: 'bg-purple-100 text-purple-700' },
  { value: 'sababsiz', label: 'Sababsiz',  badge: 'bg-red-100 text-red-700'     },
  { value: 'boshqa',   label: 'Boshqa',    badge: 'bg-gray-100 text-gray-600'   },
]

export default function Attendance() {
  const { user, can, userDoc } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const visibleDeptIds = new Set(visibleDepts.map(d => d.id))

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [employees, setEmployees] = useState([])
  const [presentIds, setPresentIds] = useState(new Set()) // empIds with work entries
  const [absences, setAbsences]     = useState({})        // { [empId]: { reason, note } }
  const [notes, setNotes]           = useState({})
  const [saving, setSaving]         = useState({})
  const [tgSending, setTgSending]   = useState(false)
  const [tgMsg, setTgMsg]           = useState('')

  // All employees
  useEffect(() => {
    return onSnapshot(collection(db, 'factory_employees'), snap => {
      setEmployees(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
          )
      )
    })
  }, [])

  // Present = has any work entry on this date (quantity > 0 OR note written)
  useEffect(() => {
    if (!date) return
    return onSnapshot(
      query(collection(db, 'factory_work_entries'), where('date', '==', date)),
      snap => {
        const ids = new Set()
        snap.docs.forEach(d => {
          const ops = d.data().operations || {}
          const hasActivity = Object.values(ops).some(
            op => Number(op.quantity) > 0 || (op.note || '').trim()
          )
          if (hasActivity) ids.add(d.data().employeeId)
        })
        setPresentIds(ids)
      }
    )
  }, [date])

  // Manually saved absence reasons
  useEffect(() => {
    if (!date) return
    return onSnapshot(
      query(collection(db, 'factory_absences'), where('date', '==', date)),
      snap => {
        const data = {}
        const noteData = {}
        snap.forEach(d => {
          const rec = d.data()
          data[rec.employeeId]    = { reason: rec.reason, note: rec.note || '' }
          noteData[rec.employeeId] = rec.note || ''
        })
        setAbsences(data)
        setNotes(n => ({ ...noteData, ...n }))
      }
    )
  }, [date])

  const saveReason = async (emp, reason, note) => {
    setSaving(s => ({ ...s, [emp.id]: true }))
    await setDoc(doc(db, 'factory_absences', `${date}_${emp.id}`), {
      date,
      employeeId:   emp.id,
      departmentId: emp.departmentId,
      reason,
      note: note ?? '',
      updatedAt:  serverTimestamp(),
      updatedBy:  user?.uid || '',
    })
    setSaving(s => ({ ...s, [emp.id]: false }))
  }

  const removeReason = async (empId) => {
    await deleteDoc(doc(db, 'factory_absences', `${date}_${empId}`))
    setNotes(n => { const c = { ...n }; delete c[empId]; return c })
  }

  const handleReasonChange = (emp, reason) => {
    saveReason(emp, reason, notes[emp.id] ?? '')
  }

  const handleNoteBlur = (emp) => {
    if (!absences[emp.id]) return
    saveReason(emp, absences[emp.id].reason, notes[emp.id] ?? '')
  }

  // Absent = no work entries today (only within visible departments)
  const visibleEmps = employees.filter(e => visibleDeptIds.has(e.departmentId) && e.isActive !== false)
  const absentEmps = visibleEmps.filter(e => !presentIds.has(e.id))
  const presentCount = visibleEmps.length - absentEmps.length

  // Group absent employees by department
  const byDept = visibleDepts
    .map(dept => ({
      dept,
      emps: absentEmps.filter(e => e.departmentId === dept.id),
    }))
    .filter(d => d.emps.length > 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Davomat</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Norma kiritilmagan xodimlar — kelmagan hisoblanadi
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <button
              disabled={tgSending}
              onClick={async () => {
                setTgSending(true)
                setTgMsg('')
                try {
                  const html = buildAttendancePDFHtml(absentEmps, visibleEmps, absences, visibleDepts, date)
                  const filename = `davomat-${date}.pdf`
                  const caption = `📋 Davomat | ${date} | Kelmaganlar: ${absentEmps.length} nafar`
                  await sendHTMLToTelegram(html, filename, caption)
                  setTgMsg('✓ Yuborildi!')
                } catch (err) {
                  setTgMsg('Xatolik: ' + err.message)
                } finally {
                  setTgSending(false)
                  setTimeout(() => setTgMsg(''), 4000)
                }
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {tgSending ? 'Yuborilmoqda...' : 'Telegram'}
            </button>
            {tgMsg && (
              <div className={`absolute top-full mt-1 right-0 text-xs px-2 py-1 rounded whitespace-nowrap z-10 ${tgMsg.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tgMsg}
              </div>
            )}
          </div>
          <button
            onClick={() => exportAttendancePDF(absentEmps, visibleEmps, absences, visibleDepts, date)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => exportAttendanceExcel(absentEmps, visibleEmps, absences, visibleDepts, date)}
            className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-700">{visibleEmps.length}</div>
          <div className="text-xs text-indigo-500 mt-1">Jami xodimlar</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{presentCount}</div>
          <div className="text-xs text-green-600 mt-1">Kelgan</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{absentEmps.length}</div>
          <div className="text-xs text-red-500 mt-1">Kelmagan</div>
        </div>
      </div>

      {absentEmps.length === 0 ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-10 text-center">
          <UserCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <div className="text-green-700 font-semibold">Barcha xodimlar kelgan!</div>
          <div className="text-xs text-green-500 mt-1">Bugun barcha xodimlar uchun norma kiritilgan</div>
        </div>
      ) : (
        <>
          {/* Quick absent banner */}
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
            <div className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5" /> Kelmaganlar ({absentEmps.length} nafar):
            </div>
            <div className="flex flex-wrap gap-2">
              {absentEmps.map(e => {
                const abs = absences[e.id]
                const reason = REASONS.find(r => r.value === abs?.reason)
                return (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-1 text-xs text-red-700"
                  >
                    {e.lastName} {e.firstName}
                    {reason && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${reason.badge}`}>
                        {reason.label}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Per department */}
          <div className="space-y-4">
            {byDept.map(({ dept, emps }) => (
              <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Dept header */}
                <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
                  <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                  <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                    {emps.length} kelmagan
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {emps.map((emp, i) => {
                    const abs = absences[emp.id]
                    const reason = REASONS.find(r => r.value === abs?.reason)

                    return (
                      <div key={emp.id} className="px-4 py-3 bg-red-50/40">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                            <span className="flex-1 min-w-0 text-sm font-medium text-red-800">
                              {emp.lastName} {emp.firstName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pl-7 sm:pl-0">
                            {can.enterHourly && (
                              <select
                                value={abs?.reason ?? ''}
                                onChange={e => {
                                  if (e.target.value) handleReasonChange(emp, e.target.value)
                                  else removeReason(emp.id)
                                }}
                                disabled={saving[emp.id]}
                                className="flex-1 sm:flex-none border border-red-200 bg-white rounded-lg px-2 py-1.5 text-xs text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
                              >
                                <option value="">— Sabab —</option>
                                {REASONS.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            )}
                            {!can.enterHourly && abs && (
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${reason?.badge}`}>
                                {reason?.label}
                              </span>
                            )}
                            {can.enterHourly && (
                              <input
                                type="text"
                                value={notes[emp.id] ?? ''}
                                onChange={e => setNotes(n => ({ ...n, [emp.id]: e.target.value }))}
                                onBlur={() => handleNoteBlur(emp)}
                                placeholder="Izoh..."
                                className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-2 py-1.5 text-xs sm:w-36 md:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            )}
                            {!can.enterHourly && abs?.note && (
                              <span className="text-xs text-gray-500">{abs.note}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Pipeline.jsx`

`````jsx
import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Activity, AlertTriangle } from 'lucide-react'

function getDateRange(period) {
  const today = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  if (period === 'today') return { from: fmt(today), to: fmt(today) }
  if (period === 'week') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    return { from: fmt(mon), to: fmt(today) }
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: fmt(from), to: fmt(today) }
}

function pctStyle(pct) {
  if (pct === null) return { bar: 'bg-gray-200', text: 'text-gray-400', row: '' }
  if (pct >= 100) return { bar: 'bg-green-500', text: 'text-green-700 font-bold', row: '' }
  if (pct >= 80)  return { bar: 'bg-yellow-400', text: 'text-yellow-700 font-semibold', row: 'bg-yellow-50/60' }
  return { bar: 'bg-red-500', text: 'text-red-700 font-bold', row: 'bg-red-50/70' }
}

export default function Pipeline() {
  const { can, userDoc } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))

  const [selectedDept, setSelectedDept] = useState('')
  const [period, setPeriod] = useState('today')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedDept && visibleDepts.length > 0) setSelectedDept(visibleDepts[0].id)
  }, [visibleDepts])

  const handleSearch = async () => {
    if (!selectedDept) return
    setLoading(true)
    setSearched(false)
    setError('')

    const { from, to } = getDateRange(period)

    try {
      const [opsSnap, entriesSnap] = await Promise.all([
        getDocs(query(collection(db, 'factory_operations'), where('departmentId', '==', selectedDept))),
        getDocs(query(
          collection(db, 'factory_work_entries'),
          where('departmentId', '==', selectedDept),
          where('date', '>=', from),
          where('date', '<=', to),
        )),
      ])

      const ops = opsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

      const opStats = {}
      entriesSnap.docs.forEach(d => {
        const entryOps = d.data().operations || {}
        Object.entries(entryOps).forEach(([opId, val]) => {
          if (!opStats[opId]) opStats[opId] = { qty: 0, expected: 0 }
          opStats[opId].qty      += Number(val.quantity || 0)
          opStats[opId].expected += Number(val.expected  || 0)
        })
      })

      setRows(ops.map(op => {
        const s = opStats[op.id]
        const pct = s?.expected > 0 ? Math.round((s.qty / s.expected) * 100) : null
        return { op, qty: s?.qty || 0, expected: s?.expected || 0, pct }
      }))

      setSearched(true)
    } catch (err) {
      setError(err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.')
    } finally {
      setLoading(false)
    }
  }

  const deptName = departments.find(d => d.id === selectedDept)?.name || ''
  const periodLabel = { today: 'Bugun', week: 'Bu hafta', month: 'Bu oy' }[period]

  const bottleneckIdx = (() => {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].pct !== null && rows[i].pct < 80) return i
    }
    return -1
  })()

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-700" />
        <h1 className="text-xl font-bold text-gray-800">Ishlab chiqarish zanjiri</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bo'lim</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Davr</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Bugun</option>
              <option value="week">Bu hafta</option>
              <option value="month">Bu oy</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !selectedDept}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Yuklanmoqda...' : 'Ko\'rish'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {searched && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-gray-800">{deptName}</span>
              <span className="text-gray-400 text-sm ml-2">— {periodLabel}</span>
            </div>
            {bottleneckIdx >= 0 && (
              <span className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Tiqilish: {rows[bottleneckIdx].op.name}
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Bu davr uchun ma'lumot topilmadi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rows.map(({ op, qty, expected, pct }, idx) => {
                const c = pctStyle(pct)
                const barW = pct === null ? 0 : Math.min(pct, 100)
                const isBottleneck = idx === bottleneckIdx

                return (
                  <div key={op.id} className={`px-4 py-3 ${c.row}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs w-6 text-right shrink-0 ${isBottleneck ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isBottleneck && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className="text-sm font-medium text-gray-800 truncate">{op.name}</span>
                          </div>
                          <span className={`text-sm shrink-0 ${c.text}`}>
                            {pct !== null ? `${pct}%` : '—'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${c.bar}`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        {expected > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {qty.toLocaleString()} / {Math.round(expected).toLocaleString()} dona
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Reports.jsx`

`````jsx
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { exportPDF, buildWorkPDFHtml } from '../utils/pdf'
import { exportExcel } from '../utils/excel'
import { sendHTMLToTelegram } from '../utils/telegram'
import { fetchOrderSummary } from '../utils/orderReport'
import { format } from 'date-fns'
import { Search, FileText, Download, Package, Star } from 'lucide-react'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function statusClass(qty, expected) {
  if (qty > expected) return 'bg-green-100 text-green-800'
  if (qty === expected) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

const today = format(new Date(), 'yyyy-MM-dd')

// Bo'lim uchun Telegram mavzu (forum topic) ID'sini aniqlaydi.
// Avval hujjatdagi telegramThreadId, bo'lmasa bo'lim nomi/ID bo'yicha standart.
function threadForDept(dept) {
  if (!dept) return undefined
  if (dept.telegramThreadId != null) return dept.telegramThreadId
  const s = `${dept.id || ''} ${dept.name || ''}`.toLowerCase()
  if (s.includes('shim'))   return 1014 // Шим булими
  if (s.includes('kamzul') || s.includes('камзул')) return 1017 // Камзул
  if (s.includes('tana') || s.includes('astar') || s.includes('montaj') || s.includes('yeng')) return 1015 // Костюм
  return undefined
}

export default function Reports() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [filterType, setFilterType] = useState('dept') // 'dept' | 'employee'
  const [selectedDept, setSelectedDept] = useState('')
  const [empSearch, setEmpSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [reportError, setReportError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [tgSending, setTgSending] = useState(false)
  const [tgMsg, setTgMsg] = useState('')

  // Auto-select first visible dept when departments load
  useEffect(() => {
    if (visibleDepts.length > 0 && !selectedDept) {
      setSelectedDept(visibleDepts[0].id)
    }
  }, [visibleDepts.length])

  const searchEmployees = async (val) => {
    setEmpSearch(val)
    const snap = await getDocs(collection(db, 'factory_employees'))
    const visibleDeptIds = new Set(visibleDepts.map(d => d.id))
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => visibleDeptIds.has(e.departmentId))
    setEmployees(
      val.length === 0
        ? all
        : all.filter(e => `${e.lastName} ${e.firstName}`.toLowerCase().includes(val.toLowerCase()))
    )
  }

  const loadReport = async () => {
    setLoading(true)
    setSearched(true)
    setReportError('')
    try {
      const constraints = [
        where('date', '>=', dateFrom),
        where('date', '<=', dateTo),
      ]
      // Bo'lim tanlanganda faqat o'sha bo'lim yozuvlarini so'raymiz (butun kolleksiya emas)
      // — Firestore o'qishlarini ~80% kamaytiradi. (departmentId+date kompozit indeks kerak)
      if (filterType === 'dept' && selectedDept) {
        constraints.push(where('departmentId', '==', selectedDept))
      }

      const entriesSnap = await getDocs(query(collection(db, 'factory_work_entries'), ...constraints))

      const [empSnap, opSnap] = await Promise.all([
        getDocs(collection(db, 'factory_employees')),
        getDocs(collection(db, 'factory_operations')),
      ])
      const empMap = {}
      empSnap.forEach(d => { empMap[d.id] = d.data() })
      const opMap = {}
      opSnap.forEach(d => { opMap[d.id] = d.data() })

      const result = []
      entriesSnap.forEach(d => {
        const entry = d.data()
        // Filter by dept/employee in JS
        if (filterType === 'dept' && entry.departmentId !== selectedDept) return
        if (filterType === 'employee' && selectedEmp && entry.employeeId !== selectedEmp.id) return
        // Filter by time range in JS (inclusive range)
        if (startTime && entry.startTime < startTime) return
        if (endTime && entry.endTime > endTime) return
        const emp = empMap[entry.employeeId]
        if (!emp) return
        const bm = entry.breakMinutes || 0
        const hours = Math.max(0, calcHours(entry.startTime, entry.endTime) - bm / 60)
        const ops = entry.operations || {}
        Object.entries(ops).forEach(([opId, data]) => {
          const op = opMap[opId]
          if (!op) return
          const expected = data.expected !== undefined ? Number(data.expected) : op.norm * hours
          const usedNorm = data.norm !== undefined ? Number(data.norm) : op.norm
          // Operatsiya bir nechta buyurtmага bo'lingan bo'lsa (allocations) — har ulush alohida qator
          const allocs = (Array.isArray(data.allocations) && data.allocations.length)
            ? data.allocations
            : [{ quantity: Number(data.quantity ?? 0), orderId: (data.orderId !== undefined ? data.orderId : entry.orderId) || null, note: data.note || '' }]
          allocs.forEach((a, ai) => {
            result.push({
              empName: `${emp.lastName} ${emp.firstName}`,
              deptName: getDeptName(emp.departmentId),
              opName: op.name,
              norm: usedNorm,
              isCustomNorm: op.norm !== undefined && Number(usedNorm) !== Number(op.norm),
              quantity: Number(a.quantity ?? 0),
              expected: ai === 0 ? expected : 0,
              note: a.note || '',
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
              breakMinutes: bm,
              isFinal: !!(op.isFinal),
              orderId: a.orderId ?? null,
            })
          })
        })
      })

      result.sort((a, b) =>
        a.empName.localeCompare(b.empName) ||
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.opName.localeCompare(b.opName)
      )
      setRows(result.filter(r => r.quantity > 0 || r.note.trim()))
    } catch (e) {
      console.error(e)
      setReportError('Xatolik yuz berdi: ' + (e.message || e.code || 'Qayta urinib ko\'ring'))
    } finally {
      setLoading(false)
    }
  }

  const filterLabel = filterType === 'dept'
    ? getDeptName(selectedDept)
    : selectedEmp ? `${selectedEmp.lastName} ${selectedEmp.firstName}` : ''
  const filtersStr = `${dateFrom} — ${dateTo} · ${startTime}-${endTime}`

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Hisobotlar</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sanadan</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sanagacha</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Soatdan</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Soatgacha</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Filter type */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setFilterType('dept'); setSelectedEmp(null) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'dept' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Bo'lim bo'yicha
          </button>
          <button
            onClick={() => setFilterType('employee')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'employee' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Xodim bo'yicha
          </button>
        </div>

        {filterType === 'dept' ? (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : (
          <div className="relative md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={selectedEmp ? `${selectedEmp.lastName} ${selectedEmp.firstName}` : empSearch}
              onChange={e => { setSelectedEmp(null); searchEmployees(e.target.value) }}
              onFocus={() => { if (!selectedEmp) searchEmployees(empSearch) }}
              onBlur={() => setTimeout(() => setEmployees([]), 200)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Xodim qidirish yoki bosing..."
            />
            {employees.length > 0 && !selectedEmp && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmp(emp); setEmployees([]) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <div>{emp.lastName} {emp.firstName}</div>
                    <div className="text-xs text-gray-400">{getDeptName(emp.departmentId)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={loadReport}
            disabled={loading || (filterType === 'employee' && !selectedEmp)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Yuklanmoqda...' : 'Hisobotni ko\'rish'}
          </button>
        </div>
      </div>

      {/* Error */}
      {reportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {reportError}
        </div>
      )}

      {/* Results */}
      {searched && (
        <>
          {/* Download buttons */}
          {can.downloadReports && rows.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative">
                <button
                  onClick={async () => {
                    setTgSending(true)
                    setTgMsg('')
                    try {
                      // Bugungi jami tayyor mahsulot (barcha smenalar bo'yicha, vaqt filtrisiz)
                      let dailyTayyor = null
                      try {
                        const [dailySnap, opSnapD] = await Promise.all([
                          getDocs(query(
                            collection(db, 'factory_work_entries'),
                            where('date', '>=', dateFrom),
                            where('date', '<=', dateTo),
                          )),
                          getDocs(collection(db, 'factory_operations')),
                        ])
                        const opMapD = {}
                        opSnapD.forEach(d => { opMapD[d.id] = d.data() })
                        dailyTayyor = 0
                        dailySnap.forEach(d => {
                          const entry = d.data()
                          if (filterType === 'dept' && entry.departmentId !== selectedDept) return
                          if (filterType === 'employee' && selectedEmp && entry.employeeId !== selectedEmp.id) return
                          Object.entries(entry.operations || {}).forEach(([opId, data]) => {
                            if (opMapD[opId]?.isFinal) dailyTayyor += Number(data.quantity || 0)
                          })
                        })
                      } catch (_) {}
                      // Buyurtma xulosasi + har qatorga buyurtma nomi
                      let orderSummary = null
                      try {
                        const orderIds = [...new Set(rows.map(r => r.orderId).filter(Boolean))]
                        const reportDept = filterType === 'dept' ? selectedDept : null
                        const { summary, orderById } = await fetchOrderSummary(db, orderIds, reportDept)
                        orderSummary = summary.length ? summary : null
                        rows.forEach(r => { r.orderName = r.orderId ? (orderById[r.orderId]?.name || '') : '' })
                      } catch (_) {}
                      const html = buildWorkPDFHtml(rows, filtersStr, filterLabel, filterType === 'employee', false, dailyTayyor, orderSummary)
                      const filename = `hisobot-${filterLabel}-${Date.now()}.pdf`
                      const caption = `📊 ${filterLabel} | ${filtersStr}`
                      // Bo'lim tanlangan bo'lsa — o'sha bo'lim mavzusiga (forum topic) yuboriladi.
                      const threadId = filterType === 'dept'
                        ? threadForDept(departments.find(d => d.id === selectedDept))
                        : undefined
                      await sendHTMLToTelegram(html, filename, caption, threadId)
                      setTgMsg('✓ Yuborildi!')
                    } catch (e) {
                      setTgMsg('Xatolik: ' + (e.message || 'Qayta urinib ko\'ring'))
                    } finally {
                      setTgSending(false)
                      setTimeout(() => setTgMsg(''), 4000)
                    }
                  }}
                  disabled={tgSending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.275c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.946z"/>
                  </svg>
                  {tgSending ? 'Yuborilmoqda...' : 'Telegram'}
                </button>
                {tgMsg && (
                  <div className={`absolute bottom-full mb-1.5 left-0 whitespace-nowrap text-xs rounded-lg px-3 py-1.5 shadow-md ${
                    tgMsg.startsWith('✓') ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                  }`}>
                    {tgMsg}
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    await exportPDF(rows, filtersStr, filterLabel, filterType === 'employee')
                  } catch (e) {
                    console.error(e)
                    setReportError('PDF xatolik: ' + (e.message || 'Qayta urinib ko\'ring'))
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                disabled={pdfLoading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <FileText className="w-4 h-4" /> {pdfLoading ? 'Yuklanmoqda...' : 'PDF'}
              </button>
              <button
                onClick={() => exportExcel(rows, filtersStr, filterLabel, filterType === 'employee')}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
          )}

          {/* Tayyor mahsulot summary */}
          {(() => {
            const tayyorByDept = {}
            rows.forEach(r => {
              if (r.isFinal) tayyorByDept[r.deptName] = (tayyorByDept[r.deptName] || 0) + r.quantity
            })
            const entries = Object.entries(tayyorByDept)
            if (!entries.length) return null
            return (
              <div className="flex flex-wrap gap-3 mb-4">
                {entries.map(([dept, count]) => (
                  <div key={dept} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <Package className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <span className="text-gray-500 text-xs">{dept}:</span>
                      <strong className="text-amber-700 ml-1">{count} tayyor mahsulot</strong>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Legend */}
          <div className="flex gap-3 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
              Normadan yuqori
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
              Normaga teng
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
              Normadan past
            </span>
          </div>

          {/* Pivot Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Tanlangan davr uchun ma'lumot topilmadi
              </div>
            ) : (() => {
              // Unique time slots sorted
              const slots = [...new Set(rows.map(r => `${r.date}|${r.startTime}–${r.endTime}`))].sort()
              const multiDate = new Set(rows.map(r => r.date)).size > 1
              // Break minutes per slot
              const slotBreaks = {}
              rows.forEach(r => {
                const k = `${r.date}|${r.startTime}–${r.endTime}`
                slotBreaks[k] = r.breakMinutes || 0
              })

              // Group by employee + dept + operation
              const grouped = {}
              rows.forEach(r => {
                const key = `${r.empName}|||${r.deptName}|||${r.opName}`
                if (!grouped[key]) {
                  grouped[key] = { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, isCustomNorm: !!r.isCustomNorm, isFinal: r.isFinal, slots: {} }
                }
                grouped[key].slots[`${r.date}|${r.startTime}–${r.endTime}`] = {
                  quantity: r.quantity, expected: r.expected, note: r.note,
                }
              })
              // Efficiency per employee for ranking
              const empEff = {}
              rows.forEach(r => {
                if (!empEff[r.empName]) empEff[r.empName] = { done: 0, exp: 0 }
                empEff[r.empName].done += Number(r.quantity || 0)
                empEff[r.empName].exp  += Number(r.expected  || 0)
              })
              const getEff = name => empEff[name]?.exp > 0
                ? Math.round((empEff[name].done / empEff[name].exp) * 100) : 0

              const gRows = Object.values(grouped).sort((a, b) =>
                getEff(b.empName) - getEff(a.empName) ||
                a.empName.localeCompare(b.empName) ||
                a.opName.localeCompare(b.opName)
              )

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">#</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Xodim</th>
                        {filterType === 'employee' && (
                          <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Bo'lim</th>
                        )}
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Operatsiya</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Norma</th>
                        {slots.map(s => {
                          const [date, time] = s.split('|')
                          const bm = slotBreaks[s] || 0
                          return (
                            <th key={s} className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap min-w-[90px]">
                              {multiDate && <div className="text-xs text-gray-400 font-normal">{date}</div>}
                              <div className="font-mono text-xs">{time}</div>
                              {bm > 0 && <div className="text-xs text-orange-500 font-normal">−{bm} daq.</div>}
                            </th>
                          )
                        })}
                        <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gRows.map((r, i) => {
                        const isNewEmp = i === 0 || gRows[i - 1].empName !== r.empName
                        const totalDone = slots.reduce((s, k) => s + (r.slots[k]?.quantity || 0), 0)
                        const totalExp = slots.reduce((s, k) => s + (r.slots[k]?.expected || 0), 0)
                        return (
                          <tr key={i} className={`hover:bg-gray-50 ${isNewEmp && i > 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}`}>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                              {isNewEmp ? (
                                <span className="flex items-center gap-2">
                                  {r.empName}
                                  {(() => {
                                    const e = getEff(r.empName)
                                    const cls = e >= 100 ? 'bg-green-100 text-green-700' : e >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{e}%</span>
                                  })()}
                                </span>
                              ) : ''}
                            </td>
                            {filterType === 'employee' && (
                              <td className="px-4 py-2.5">
                                {isNewEmp && (
                                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap">{r.deptName}</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                              {r.opName}
                              {r.isFinal && <Star className="inline-block w-3 h-3 text-amber-500 fill-amber-500 ml-1 -mt-0.5" />}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                              {r.norm} dona/soat
                              {r.isCustomNorm && (
                                <span className="ml-1.5 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
                                  shaxsiy{totalExp > 0 ? ` ${Math.round((totalDone / totalExp) * 100)}%` : ''}
                                </span>
                              )}
                            </td>
                            {slots.map(k => {
                              const d = r.slots[k]
                              if (!d) return (
                                <td key={k} className="px-3 py-2.5 text-center text-gray-200 text-xs">—</td>
                              )
                              const cls = statusClass(d.quantity, d.expected)
                              return (
                                <td key={k} className="px-3 py-2.5 text-center">
                                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${cls}`}>{d.quantity}</span>
                                  <div className="text-xs text-gray-400 mt-0.5">{d.expected.toFixed(0)}</div>
                                  {d.note && (
                                    <div className="text-xs text-gray-500 italic mt-1 leading-tight max-w-[100px] mx-auto break-words">
                                      {d.note}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-bold px-2 py-0.5 rounded text-xs ${statusClass(totalDone, totalExp)}`}>{totalDone}</span>
                              <div className="text-xs text-gray-400 mt-0.5">{totalExp.toFixed(0)}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/MonthlyReport.jsx`

`````jsx
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { BarChart2, Download } from 'lucide-react'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function monthDates(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export default function MonthlyReport() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDept, setSelectedDept] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!selectedDept && visibleDepts.length > 0) setSelectedDept(visibleDepts[0].id)
  }, [visibleDepts])

  const handleSearch = async () => {
    if (!selectedDept) return
    setLoading(true)
    setSearched(false)

    const { from, to } = monthDates(year, month)

    const [entriesSnap, empSnap, allEmpSnap, absSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'factory_work_entries'),
        where('departmentId', '==', selectedDept),
        where('date', '>=', from),
        where('date', '<=', to),
      )),
      getDocs(query(collection(db, 'factory_employees'), where('departmentId', '==', selectedDept))),
      getDocs(collection(db, 'factory_employees')),
      getDocs(query(
        collection(db, 'factory_absences'),
        where('departmentId', '==', selectedDept),
        where('date', '>=', from),
        where('date', '<=', to),
      )),
    ])

    const empMap = {}
    empSnap.docs.forEach(d => { empMap[d.id] = { id: d.id, ...d.data() } })

    const allEmpMap = {}
    allEmpSnap.docs.forEach(d => { allEmpMap[d.id] = { id: d.id, ...d.data() } })

    const absMap = {}
    absSnap.docs.forEach(d => {
      const a = d.data()
      if (!absMap[a.employeeId]) absMap[a.employeeId] = 0
      absMap[a.employeeId]++
    })

    const summary = {}
    entriesSnap.docs.forEach(d => {
      const e = d.data()
      const empId = e.employeeId
      const isGuest = !!e.isGuest
      if (!empMap[empId] && !isGuest) return
      if (isGuest && !allEmpMap[empId]) return
      const bm = e.breakMinutes || 0
      const h = Math.max(0, calcHours(e.startTime, e.endTime) - bm / 60)
      if (!summary[empId]) {
        summary[empId] = { empId, totalHours: 0, totalDays: 0, totalQty: 0, totalExpected: 0, totalPay: 0, isGuest }
      }
      summary[empId].totalHours += h
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)
      const ops = e.operations || {}
      Object.values(ops).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
        summary[empId].totalExpected += Number(op.expected || 0)
      })
    })

    const result = Object.values(summary).map(s => {
      const emp = empMap[s.empId] || allEmpMap[s.empId]
      const pct = s.totalExpected > 0 ? Math.round((s.totalQty / s.totalExpected) * 100) : null
      return {
        ...s,
        name: `${emp.lastName} ${emp.firstName}`,
        absentDays: absMap[s.empId] || 0,
        pct,
      }
    }).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))

    setRows(result)
    setLoading(false)
    setSearched(true)
  }

  const pctColor = (pct) => {
    if (pct === null) return 'text-gray-400'
    if (pct > 100) return 'text-green-700 font-bold'
    if (pct === 100) return 'text-indigo-700 font-bold'
    if (pct >= 95) return 'text-yellow-700 font-semibold'
    return 'text-red-700 font-semibold'
  }

  const { from, to } = monthDates(year, month)
  const monthName = new Date(year, month - 1, 1).toLocaleString('uz-UZ', { month: 'long', year: 'numeric' })

  const handleExport = () => {
    if (!rows.length) return
    const lines = [
      `${getDeptName(selectedDept)} — ${monthName}`,
      '',
      ['#', 'Xodim', 'Ish kunlari', 'Soat', 'Bajarilgan', 'Kutilgan', 'Foiz %', 'Davomat', 'Maosh (so\'m)'].join('\t'),
      ...rows.map((r, i) => [
        i + 1,
        r.name,
        r.totalDays,
        r.totalHours.toFixed(1),
        r.totalQty,
        Math.round(r.totalExpected),
        r.pct !== null ? r.pct + '%' : '—',
        r.absentDays > 0 ? `${r.absentDays} kun kelmagan` : 'To\'liq',
        r.totalPay > 0 ? r.totalPay.toLocaleString() : '—',
      ].join('\t')),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oylik-hisobot-${from}-${to}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = [now.getFullYear() - 1, now.getFullYear()]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-700" />
          <h1 className="text-xl font-bold text-gray-800">Oylik hisobot</h1>
        </div>
        {searched && rows.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Yil</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Oy</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(year, m - 1, 1).toLocaleString('uz-UZ', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bo'lim</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !selectedDept}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Yuklanmoqda...' : 'Ko\'rish'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {searched && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">{getDeptName(selectedDept)}</span>
              <span className="text-gray-400 text-sm ml-2">— {monthName}</span>
            </div>
            <span className="text-sm text-gray-500">{rows.length} xodim</span>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Bu oy uchun ma'lumot topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Xodim</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Ish kunlari</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Soat</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Bajarilgan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Kutilgan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Foiz</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Davomat</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Maosh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={r.empId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span>{r.name}</span>
                        {r.isGuest && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Mehmon</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalDays}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{Math.round(r.totalExpected).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-center ${pctColor(r.pct)}`}>
                        {r.pct !== null ? `${r.pct}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.absentDays > 0
                          ? <span className="text-red-600 text-xs">{r.absentDays} kun kelmagan</span>
                          : <span className="text-green-600 text-xs">To'liq</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {r.totalPay > 0 ? `${r.totalPay.toLocaleString()} so'm` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 1 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Jami</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {rows.reduce((s, r) => s + r.totalQty, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {Math.round(rows.reduce((s, r) => s + r.totalExpected, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {(() => {
                          const tq = rows.reduce((s, r) => s + r.totalQty, 0)
                          const te = rows.reduce((s, r) => s + r.totalExpected, 0)
                          return te > 0 ? `${Math.round((tq / te) * 100)}%` : '—'
                        })()}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {rows.reduce((s, r) => s + r.totalPay, 0) > 0
                          ? `${rows.reduce((s, r) => s + r.totalPay, 0).toLocaleString()} so'm`
                          : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Shifts.jsx`

`````jsx
import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, Check, X, Clock, Star } from 'lucide-react'

export default function Shifts() {
  const { can } = useAuth()
  const [shifts, setShifts] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', slots: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'factory_shifts'), snap => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openAdd = () => {
    setForm({ name: '', slots: [{ startTime: '08:00', endTime: '09:00', breakMinutes: 0 }] })
    setModal('add')
  }

  const openEdit = (shift) => {
    setForm({ name: shift.name, slots: [...(shift.slots || [])] })
    setModal(shift)
  }

  const addSlot = () => {
    setForm(f => ({ ...f, slots: [...f.slots, { startTime: '', endTime: '', breakMinutes: 0 }] }))
  }

  const removeSlot = (i) => {
    setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }))
  }

  const updateSlot = (i, field, value) => {
    setForm(f => ({
      ...f,
      slots: f.slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.slots.length === 0) return
    setSaving(true)
    const data = {
      name: form.name.trim(),
      slots: form.slots.filter(s => s.startTime && s.endTime),
    }
    if (modal === 'add') {
      await addDoc(collection(db, 'factory_shifts'), {
        ...data,
        isActive: shifts.length === 0,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'factory_shifts', modal.id), data)
    }
    setSaving(false)
    setModal(null)
  }

  const handleSetActive = async (shift) => {
    await Promise.all(
      shifts.map(s => updateDoc(doc(db, 'factory_shifts', s.id), { isActive: s.id === shift.id }))
    )
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    await deleteDoc(doc(db, 'factory_shifts', id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Smena jadvallari</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Jadval qo'shish
          </button>
        )}
      </div>

      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center text-gray-400 text-sm">
          Smena jadvali qo'shilmagan
        </div>
      ) : (
        <div className="space-y-4">
          {shifts.map(shift => (
            <div key={shift.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${shift.isActive ? 'border-indigo-300' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{shift.name}</span>
                  {shift.isActive && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-indigo-600" /> Faol
                    </span>
                  )}
                </div>
                {can.manageMembers && (
                  <div className="flex gap-2">
                    {!shift.isActive && (
                      <button
                        onClick={() => handleSetActive(shift)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Faol qilish
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(shift)}
                      className="text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      O'chirish
                    </button>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {(shift.slots || []).map((slot, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {slot.startTime}–{slot.endTime}
                    {slot.breakMinutes > 0 && (
                      <span className="text-orange-500 ml-0.5">⏸{slot.breakMinutes}'</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi jadval' : 'Jadvalni tahrirlash'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jadval nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Yozgi jadval"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Vaqt oralig'lari
                  </label>
                  <button
                    onClick={addSlot}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                  </button>
                </div>
                <div className="text-xs text-gray-400 mb-3">Boshlanish · Tugash · Tanaffus (daq.)</div>
                <div className="space-y-2">
                  {form.slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateSlot(i, 'startTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                      />
                      <span className="text-gray-400">–</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateSlot(i, 'endTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                      />
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={slot.breakMinutes || ''}
                        onChange={e => updateSlot(i, 'breakMinutes', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-16 text-center"
                        placeholder="0"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || form.slots.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Members.jsx`

`````jsx
import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentsContext'
import { Plus, Trash2, X, Check, Shield, Eye, Download, Pencil, Clock, UserX, UserCheck } from 'lucide-react'

const ROLES = [
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Barcha imkoniyatlar' },
  { id: 'entry', label: 'Kirituvchi', icon: Pencil, desc: "Barcha ma'lumotlarni kiritish" },
  { id: 'hourly', label: 'Soatbay', icon: Clock, desc: 'Faqat soatbay ish kiritish' },
  { id: 'reporter', label: 'Hisobotchi', icon: Download, desc: "Ko'rish + hisobot yuklab olish" },
  { id: 'viewer', label: "Ko'ruvchi", icon: Eye, desc: "Faqat ko'rish" },
]

const roleColors = {
  admin: 'bg-purple-100 text-purple-800',
  entry: 'bg-indigo-100 text-indigo-800',
  hourly: 'bg-orange-100 text-orange-800',
  reporter: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-700',
}

const empty = { name: '', email: '', password: '', roles: ['viewer'], departmentIds: [] }

function getRoles(member) {
  if (Array.isArray(member.roles)) return member.roles
  if (member.role) return [member.role]
  return ['viewer']
}

// Secondary Firebase app for creating users without signing out current user
function getSecondaryAuth() {
  const config = {
    apiKey: "AIzaSyDAGKw5FHLh_dyDC6dvQeJUzX7Xi34fYWk",
    authDomain: "ishlab-chiqarish-ec750.firebaseapp.com",
    projectId: "ishlab-chiqarish-ec750",
    storageBucket: "ishlab-chiqarish-ec750.firebasestorage.app",
    messagingSenderId: "329770242502",
    appId: "1:329770242502:web:f7bf311986e0478404e2c7",
  }
  const secondaryName = 'factory-secondary'
  const existing = getApps().find(a => a.name === secondaryName)
  const app = existing || initializeApp(config, secondaryName)
  return getAuth(app)
}

export default function Members() {
  const { userDoc, can } = useAuth()
  const { departments } = useDepartments()
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_users'), orderBy('name'))
    return onSnapshot(q, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const openAdd = () => { setForm(empty); setError(''); setModal('add') }
  const closeModal = () => { setModal(null); setError('') }

  const toggleRole = (roleId) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(roleId)
        ? f.roles.filter(r => r !== roleId)
        : [...f.roles, roleId],
    }))
  }

  const toggleDept = (deptId) => {
    setForm(f => ({
      ...f,
      departmentIds: f.departmentIds.includes(deptId)
        ? f.departmentIds.filter(d => d !== deptId)
        : [...f.departmentIds, deptId],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (form.roles.length === 0) { setError("Kamida bitta rol tanlang"); return }
    setError('')
    setSaving(true)
    try {
      if (modal === 'add') {
        if (!form.password || form.password.length < 6) {
          setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
          setSaving(false)
          return
        }
        // Create Firebase Auth user via secondary app
        const secondAuth = getSecondaryAuth()
        const cred = await createUserWithEmailAndPassword(secondAuth, form.email.trim(), form.password)
        const uid = cred.user.uid
        await fbSignOut(secondAuth)

        // Save user doc
        await setDoc(doc(db, 'factory_users', uid), {
          name: form.name.trim(),
          email: form.email.trim(),
          roles: form.roles,
          departmentIds: form.departmentIds,
          createdAt: serverTimestamp(),
        })

        // Also create pending in case needed
        const emailKey = form.email.trim().replace(/[.@]/g, '_')
        await setDoc(doc(db, 'factory_pending', emailKey), {
          name: form.name.trim(),
          roles: form.roles,
        })
      } else {
        await setDoc(doc(db, 'factory_users', modal.id), {
          name: form.name.trim(),
          roles: form.roles,
          departmentIds: form.departmentIds,
        }, { merge: true })
      }
      closeModal()
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        // User already self-registered — just write factory_pending so they can log in
        try {
          const emailKey = form.email.trim().replace(/[.@]/g, '_')
          await setDoc(doc(db, 'factory_pending', emailKey), {
            name: form.name.trim(),
            roles: form.roles,
          })
          closeModal()
        } catch (e2) {
          setError(e2.message)
        }
      } else {
        setError(e.message)
      }
    }
    setSaving(false)
  }

  const handleToggleDisabled = async (member) => {
    if (member.email === userDoc?.email) { alert("O'z akkauntingizni bloklaya olmaysiz"); return }
    const newDisabled = !member.disabled
    await setDoc(doc(db, 'factory_users', member.id), { disabled: newDisabled }, { merge: true })
  }

  const handleDelete = async (member) => {
    if (!confirm(`${member.name} ni o'chirishni tasdiqlaysizmi?`)) return
    if (member.email === userDoc?.email) { alert("O'z akkauntingizni o'chira olmaysiz"); return }
    setDeleting(member.id)
    await deleteDoc(doc(db, 'factory_users', member.id))
    setDeleting(null)
  }

  const openEdit = (m) => {
    setForm({ name: m.name, email: m.email, password: '', roles: getRoles(m), departmentIds: m.departmentIds || [] })
    setError('')
    setModal(m)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">A'zolar</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> A'zo qo'shish
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">A'zolar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(member => {
              const memberRoles = getRoles(member)
              return (
                <div key={member.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 ${member.disabled ? 'opacity-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${member.disabled ? 'bg-gray-400' : 'bg-indigo-600'}`}>
                    {member.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm flex items-center gap-2 flex-wrap">
                      {member.name}
                      {member.disabled && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Bloklangan</span>
                      )}
                    </div>
                    {member.departmentIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {member.departmentIds.map(dId => {
                          const d = departments.find(x => x.id === dId)
                          return d ? (
                            <span key={dId} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{d.name}</span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {memberRoles.map(roleId => {
                      const roleInfo = ROLES.find(r => r.id === roleId)
                      const RoleIcon = roleInfo?.icon || Shield
                      return (
                        <div key={roleId} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[roleId] || roleColors.viewer}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo?.label || roleId}
                        </div>
                      )
                    })}
                  </div>
                  {can.manageMembers && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(member)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleDisabled(member)}
                        title={member.disabled ? 'Faollashtirish' : 'Bloklash'}
                        className={`transition-colors ${member.disabled ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-orange-500'}`}
                      >
                        {member.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        disabled={deleting === member.id}
                        className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi a'zo" : "A'zoni tahrirlash"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ism Familya" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={modal !== 'add'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  placeholder="email@misol.com" />
              </div>
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Kamida 6 belgi" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol va cheklov</label>
                <div className="space-y-2">
                  {ROLES.map(role => {
                    const Icon = role.icon
                    const checked = form.roles.includes(role.id)
                    return (
                      <label key={role.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(role.id)}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-800">{role.label}</div>
                          <div className="text-xs text-gray-500">{role.desc}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bo'limlar <span className="text-gray-400 font-normal text-xs">(bo'sh = barchasi)</span>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {departments.map(dept => {
                    const checked = form.departmentIds.includes(dept.id)
                    return (
                      <label key={dept.id} className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDept(dept.id)}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <span className="text-sm text-gray-800">{dept.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer buttons - always visible */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim() || form.roles.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/Settings.jsx`

`````jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HelpCircle, LogOut, Phone, Mail, X } from 'lucide-react'

export default function Settings() {
  const { signOut, userDoc } = useAuth()
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* User info */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userDoc?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm truncate">{userDoc?.name}</div>
            <div className="text-xs text-gray-400 truncate">{userDoc?.email}</div>
          </div>
        </div>

        {/* Yordam */}
        <button
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-gray-800">Yordam</span>
        </button>

        {/* Chiqish */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-sm font-medium text-red-600">Chiqish</span>
        </button>
      </div>

      {/* Yordam modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-enter">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">Yordam</h2>
              <button onClick={() => setHelpOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href="tel:+998917606666"
                className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Telefon</div>
                  <div className="text-sm font-semibold text-gray-800">+998 91 760 66 66</div>
                </div>
              </a>

              <a
                href="mailto:kaftimda@gmail.com"
                className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Email</div>
                  <div className="text-sm font-semibold text-gray-800">kaftimda@gmail.com</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`````


## `ishlab-chiqarish/src/pages/TVDisplay.jsx`

`````jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, getDocs, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'

const PER_PAGE = 2

function shortSlot(slot) {
  return slot.replace('–', ' – ')
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

export default function TVDisplay() {
  const { deptId } = useParams()
  const [deptName, setDeptName] = useState('...')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ total: 0, attended: 0, absent: 0, done: 0, expected: 0, tayyor: 0 })
  const [page, setPage] = useState(0)
  const [clock, setClock] = useState(new Date())
  const [lastUpdated, setLastUpdated] = useState(null)

  // Department name
  useEffect(() => {
    getDoc(doc(db, 'factory_departments', deptId)).then(d => {
      if (d.exists()) setDeptName(d.data().name)
    })
  }, [deptId])

  // Employees + operations (bir marta) + work entries (har 2 daqiqada yangilanadi)
  useEffect(() => {
    let cancelled = false
    let timer = null
    let ctx = null // { allEmps, normMap, opNameMap, finalOpId }

    function processEntries(snap) {
      const { allEmps, normMap, opNameMap, finalOpId } = ctx
      // empData: { empId: { ops: { opId: { slots: { slotKey: qty }, total, exp } } } }
      const empData = {}
      const seenEmp = new Set()
      let totalDone = 0
      let totalExp = 0
      let totalTayyor = 0
      let lastEndTime = ''

      snap.forEach(entry => {
        const d = entry.data()
        const hasQty = Object.values(d.operations || {}).some(op => Number(op.quantity) > 0)
        if (hasQty) seenEmp.add(d.employeeId)
        if (d.endTime && d.endTime > lastEndTime) lastEndTime = d.endTime
        const slot = `${d.startTime}–${d.endTime}`
        const hours = Math.max(0, calcHours(d.startTime, d.endTime) - Number(d.breakMinutes || 0) / 60)

        if (!empData[d.employeeId]) empData[d.employeeId] = { ops: {}, totalQty: 0, totalExp: 0 }

        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          const qty = Number(val.quantity || 0)
          const exp = val.expected !== undefined ? Number(val.expected) : (normMap[opId] || 0) * hours

          if (!empData[d.employeeId].ops[opId]) {
            empData[d.employeeId].ops[opId] = { slots: {}, total: 0, exp: 0, norm: null }
          }
          // Saqlangan norma (shaxsiy bo'lishi mumkin) — ko'rsatish uchun
          if (val.norm !== undefined) empData[d.employeeId].ops[opId].norm = Number(val.norm)
          if (!empData[d.employeeId].ops[opId].slots[slot]) {
            empData[d.employeeId].ops[opId].slots[slot] = { qty: 0, exp: 0, note: '' }
          }
          empData[d.employeeId].ops[opId].slots[slot].qty += qty
          empData[d.employeeId].ops[opId].slots[slot].exp += exp
          if (val.note) empData[d.employeeId].ops[opId].slots[slot].note = val.note
          empData[d.employeeId].ops[opId].total += qty
          empData[d.employeeId].ops[opId].exp   += exp
          empData[d.employeeId].totalQty += qty
          empData[d.employeeId].totalExp += exp
          totalDone += qty
          totalExp  += exp
          if (opId === finalOpId) totalTayyor += qty
        })
      })

      const sorted = allEmps
        .filter(e => seenEmp.has(e.id))
        .map(e => {
          const data = empData[e.id] || { ops: {}, totalQty: 0, totalExp: 0 }
          const ops = Object.entries(data.ops).map(([opId, op]) => ({
            name: opNameMap[opId] || opId,
            norm: op.norm != null ? op.norm : (normMap[opId] || 0),
            slots: op.slots,
            total: op.total,
            exp: op.exp,
          }))
          return {
            id: e.id,
            name: [e.lastName, e.firstName].filter(s => s && s.trim() && s.trim() !== '.').join(' '),
            totalQty: data.totalQty,
            totalExp: data.totalExp,
            ops,
          }
        })
        .sort((a, b) => {
          const tier = e => {
            if (!e.totalExp) return 2
            if (e.totalQty > e.totalExp)           return 0  // yashil: 100%+
            if (e.totalQty === e.totalExp)         return 1  // sariq: aynan 100%
            if (e.totalQty >= e.totalExp * 0.95)  return 2  // qizil: 95-99%
            return 3                                          // to'q qizil: <95%
          }
          const ta = tier(a), tb = tier(b)
          if (ta !== tb) return ta - tb
          const ea = a.totalExp > 0 ? a.totalQty / a.totalExp : 0
          const eb = b.totalExp > 0 ? b.totalQty / b.totalExp : 0
          return eb - ea
        })

      setRows(sorted)
      setStats({ total: allEmps.length, attended: seenEmp.size, absent: allEmps.length - seenEmp.size, done: totalDone, expected: totalExp, tayyor: totalTayyor })
      setLastUpdated(lastEndTime || null)
    }

    let lastStamp = 0   // oxirgi ko'rilgan signal vaqti
    let lastDate = ''   // oxirgi to'liq o'qish sanasi

    // Ish yozuvlarini to'liq o'qiydi (faqat kerak bo'lganda chaqiriladi)
    async function fullRead() {
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      lastDate = dateStr
      const snap = await getDocs(query(
        collection(db, 'factory_work_entries'),
        where('date', '==', dateStr),
        where('departmentId', '==', deptId),
      ))
      if (cancelled) return
      processEntries(snap)
    }

    // Faqat bitta kichik "signal" hujjatini o'qiydi (arzon). O'zgargan bo'lsa — to'liq o'qiydi.
    async function checkSignal() {
      if (!ctx) return
      // Yangi kunga o'tган bo'lsa — to'liq o'qish (sana o'zgardi)
      if (format(new Date(), 'yyyy-MM-dd') !== lastDate) { await fullRead(); return }
      try {
        const mk = await getDoc(doc(db, 'factory_updates', deptId))
        const stamp = mk.exists() ? (mk.data().updatedAt?.toMillis?.() || 0) : 0
        if (stamp > lastStamp) { lastStamp = stamp; await fullRead() }
      } catch (_) { /* signal o'qilmasa — keyingi tekshiruvда qayta urinadi */ }
    }

    async function setup() {
      const [empSnap, opSnap] = await Promise.all([
        getDocs(query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))),
        getDocs(collection(db, 'factory_operations')),
      ])
      if (cancelled) return

      const allEmps = empSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.isActive !== false)

      const normMap = {}
      const opNameMap = {}
      let finalOpId = null
      opSnap.forEach(d => {
        const data = d.data()
        normMap[d.id] = data.norm || 0
        opNameMap[d.id] = data.name || d.id
        if (data.isFinal && data.departmentId === deptId) finalOpId = d.id
      })

      ctx = { allEmps, normMap, opNameMap, finalOpId }
      await fullRead()
      // Boshlang'ich signal vaqtini eslab qolamiz (darrov qayta o'qimaslik uchun)
      try {
        const mk = await getDoc(doc(db, 'factory_updates', deptId))
        lastStamp = mk.exists() ? (mk.data().updatedAt?.toMillis?.() || 0) : 0
      } catch (_) {}
      // Har 30 soniyada faqat signalни tekshiradi (1 o'qish); o'zgarsa to'liq yangilaydi
      timer = setInterval(checkSignal, 30000)
    }

    setup()
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [deptId])

  // Auto-paginate every 6 seconds
  useEffect(() => {
    const total = Math.ceil(rows.length / PER_PAGE)
    if (total <= 1) return
    const t = setInterval(() => setPage(p => (p + 1) % total), 7000)
    return () => clearInterval(t)
  }, [rows.length])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const pageRows = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const allSlots = [...new Set(rows.flatMap(emp => emp.ops.flatMap(op => Object.keys(op.slots))))].sort()

  function slotColor(qty, exp) {
    if (!exp) return { bg: '#f1f5f9', color: '#94a3b8' }
    if (qty > exp)          return { bg: '#dcfce7', color: '#15803d' }  // yashil: 100%+
    if (qty === exp)        return { bg: '#dbeafe', color: '#1d4ed8' }  // ko'k: aynan 100%
    if (qty >= exp * 0.95)  return { bg: '#fef9c3', color: '#a16207' }  // sariq: 95-99%
    return                         { bg: '#fee2e2', color: '#b91c1c' }  // qizil: <95%
  }
  const eff = stats.expected > 0 ? Math.round((stats.done / stats.expected) * 100) : null
  const effColor = eff === null ? '#94a3b8' : eff >= 100 ? '#4ade80' : eff >= 80 ? '#fbbf24' : '#f87171'
  const timeStr = clock.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tashkent' })
  const dateStr = clock.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Tashkent' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      color: '#1e293b',
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: '#0f1c3a',
        borderBottom: '3px solid #D97706',
        padding: '16px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>
            <span style={{ color: '#D97706' }}>KAFT</span><span style={{ color: '#ffffff' }}>IMDA</span>
          </div>
          <div style={{ height: 3, background: '#D97706', borderRadius: 2, margin: '6px 0 5px' }} />
          <div style={{ fontSize: 18, color: '#93c5fd', letterSpacing: 0.3, marginBottom: 4 }}>Biznesingiz kaftingizda</div>
          <div style={{ fontSize: 20, color: '#e2e8f0', fontWeight: 700 }}>{deptName}</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, flex: 1, justifyContent: 'center' }}>
          {[
            { label: 'Jami xodimlar',    value: stats.total,                     color: '#f8fafc'  },
            { label: 'Kelgan',           value: stats.attended,                   color: '#4ade80'  },
            { label: 'Kelmagan',         value: stats.absent,                     color: '#f87171'  },
            { label: 'Tayyor mahsulot',  value: stats.tayyor,                     color: '#f59e0b'  },
            { label: 'Samaradorlik',     value: eff !== null ? `${eff}%` : '—',  color: effColor   },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '14px 28px',
              minWidth: 130,
            }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 15, color: '#94a3b8', marginTop: 7 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div style={{ textAlign: 'right', minWidth: 180 }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: 'tabular-nums', color: '#ffffff' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#94a3b8', fontSize: 22,
          }}>
            Bugun ma'lumot kiritilmagan
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#1a202c' }}>
                <th style={{ width: 56, padding: '10px 8px', textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Xodim</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Operatsiya</th>
                <th style={{ width: 110, padding: '10px 8px', textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#93c5fd' }}>Norma</th>
                {allSlots.map(slot => (
                  <th key={slot} style={{ width: 130, padding: '10px 6px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#93c5fd' }}>
                    {shortSlot(slot)}
                  </th>
                ))}
                <th style={{ width: 110, padding: '10px 8px', textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((emp, i) => {
                const rank = page * PER_PAGE + i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                const rowBg = i % 2 === 1 ? '#e8edf3' : '#ffffff'
                return emp.ops.map((op, opIdx) => {
                  const totalSt = slotColor(op.total, op.exp)
                  return (
                    <tr key={`${emp.id}-${op.name}`} style={{
                      background: rowBg,
                      borderTop: opIdx === 0 ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
                    }}>
                      {opIdx === 0 && (
                        <td rowSpan={emp.ops.length} style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#94a3b8', verticalAlign: 'middle', padding: '10px 8px' }}>
                          {rank}
                        </td>
                      )}
                      {opIdx === 0 && (
                        <td rowSpan={emp.ops.length} style={{ padding: '10px 12px', fontSize: 22, fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {medal && <span style={{ marginRight: 6 }}>{medal}</span>}{emp.name}
                        </td>
                      )}
                      <td style={{ padding: '8px 12px', fontSize: 32, color: '#1d4ed8', fontWeight: 700 }}>{op.name}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 24, color: '#b45309', fontWeight: 700 }}>{op.norm} d/s</td>
                      {allSlots.map(slot => {
                        const sd = op.slots[slot]
                        if (!sd) return <td key={slot} style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 18 }}>—</td>
                        const st = slotColor(sd.qty, sd.exp)
                        return (
                          <td key={slot} style={{ textAlign: 'center', padding: '5px 4px' }}>
                            <div style={{ background: st.bg, borderRadius: 8, padding: '4px 8px', display: 'inline-block', minWidth: 58 }}>
                              <div style={{ fontSize: 32, fontWeight: 800, color: st.color, lineHeight: 1.2 }}>{sd.qty}</div>
                              <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1 }}>{Math.round(sd.exp)}</div>
                            </div>
                            {sd.note && (
                              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', marginTop: 3, maxWidth: 120, wordBreak: 'break-word' }}>{sd.note}</div>
                            )}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                        <div style={{ background: totalSt.bg, borderRadius: 8, padding: '4px 8px', display: 'inline-block', minWidth: 58 }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: totalSt.color, lineHeight: 1.2 }}>{op.total}</div>
                          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1 }}>{Math.round(op.exp)}</div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      <div style={{
        padding: '12px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderTop: '1px solid #cbd5e1',
        flexShrink: 0,
        position: 'relative',
      }}>
        {totalPages > 1 && (<>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} style={{
              width: i === page ? 36 : 10,
              height: 10,
              borderRadius: 5,
              background: i === page ? '#3b82f6' : '#cbd5e1',
              transition: 'all 0.4s',
            }} />
          ))}
          <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 16 }}>
            {page + 1} / {totalPages} &nbsp;·&nbsp; har 7 soniyada almashinadi
          </span>
        </>)}
        {lastUpdated && (
          <div style={{ position: 'absolute', right: 40, fontSize: 17, color: '#f87171', fontWeight: 700 }}>
            🔴 Yangilandi: {lastUpdated}
          </div>
        )}
      </div>
    </div>
  )
}
`````


## `ishlab-chiqarish/api/daily-report.js`

`````js
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { computeOrderChain, forecastOrder } from '../src/utils/orderProgress.js'

const DEPARTMENTS = [
  { id: 'bichuv',    name: "Bichuv bo'limi" },
  { id: 'kamzul',    name: "Kamzul bo'limi" },
  { id: 'shim',      name: "Shim bo'limi" },
  { id: 'tana',      name: "Tana bo'limi" },
  { id: 'astar',     name: "Astar bo'limi" },
  { id: 'montaj',    name: "Montaj bo'limi" },
  { id: 'pardoz',    name: "Pardoz dazmol bo'limi" },
  { id: 'qadoqlash', name: "Qadoqlash bo'limi" },
]

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function effEmoji(eff) {
  if (eff === null || eff === 0) return '⚪'
  if (eff >= 100) return '🟢'
  if (eff >= 80) return '🟡'
  return '🔴'
}

function getTashkentDate() {
  const now = new Date()
  const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  return tashkent.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  // Vercel cron authorization
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const today = getTashkentDate()

    const [deptSnap, empSnap, opSnap, entriesSnap] = await Promise.all([
      db.collection('factory_departments').get(),
      db.collection('factory_employees').get(),
      db.collection('factory_operations').get(),
      db.collection('factory_work_entries').where('date', '==', today).get(),
    ])

    const departments = deptSnap.empty
      ? DEPARTMENTS
      : deptSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const normMap = {}
    const finalOpMap = {}
    opSnap.docs.forEach(d => {
      const data = d.data()
      normMap[d.id] = data.norm || 0
      if (data.isFinal) finalOpMap[data.departmentId] = d.id
    })

    const deptData = {}
    departments.forEach(d => {
      deptData[d.id] = { name: d.name, employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
    })

    empSnap.docs.forEach(doc => {
      const { departmentId, isActive } = doc.data()
      if (deptData[departmentId] && isActive !== false) deptData[departmentId].employees++
    })

    const seenEmp = new Set()
    entriesSnap.docs.forEach(doc => {
      const d = doc.data()
      const dd = deptData[d.departmentId]
      if (!dd) return
      const key = `${d.departmentId}_${d.employeeId}`
      if (!seenEmp.has(key)) { seenEmp.add(key); dd.attended++ }
      const hours = calcHours(d.startTime, d.endTime)
      Object.entries(d.operations || {}).forEach(([opId, val]) => {
        const qty = Number(val.quantity || 0)
        dd.done += qty
        // Saqlangan expected (shaxsiy norma bilan) — bo'lmasa umumiy normadan hisoblanadi
        dd.expected += val.expected !== undefined ? Number(val.expected) : (normMap[opId] || 0) * hours
        if (finalOpMap[d.departmentId] === opId) dd.tayyor += qty
      })
    })

    const totalEmp      = Object.values(deptData).reduce((s, d) => s + d.employees, 0)
    const totalAttended = Object.values(deptData).reduce((s, d) => s + d.attended, 0)
    const totalDone     = Object.values(deptData).reduce((s, d) => s + d.done, 0)
    const totalExp      = Object.values(deptData).reduce((s, d) => s + d.expected, 0)
    const totalEff      = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : null
    const totalTayyor   = Object.values(deptData).reduce((s, d) => s + d.tayyor, 0)

    const deptLines = departments
      .map(dept => {
        const d = deptData[dept.id]
        if (!d || d.employees === 0) return null
        const eff = d.expected > 0 ? Math.round((d.done / d.expected) * 100) : null
        const absent = d.employees - d.attended
        return (
          `${effEmoji(eff)} *${d.name}*\n` +
          `   Kelgan: ${d.attended}/${d.employees}` +
          (absent > 0 ? ` (${absent} yo'q)` : '') +
          ` | ${eff !== null ? eff + '%' : '—'}`
        )
      })
      .filter(Boolean)
      .join('\n')

    const overallEmoji = effEmoji(totalEff)
    const dateFormatted = today.split('-').reverse().join('.')

    // Buyurtmalar holati
    let orderLines = ''
    try {
      const ordersSnap = await db.collection('factory_orders').get()
      const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.isActive !== false)
      if (allOrders.length) {
        const opById = {}
        opSnap.docs.forEach(d => { const o = d.data(); opById[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })
        // Eski (entry.orderId) + yangi (op ichidagi orderId → entry.orderIds) yozuvlarni birlashtiramiz
        const ids = [...allOrders.map(o => o.id), 'auto']
        const byDoc = new Map()
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30)
          const [legacy, tagged] = await Promise.all([
            db.collection('factory_work_entries').where('orderId', 'in', chunk).get(),
            db.collection('factory_work_entries').where('orderIds', 'array-contains-any', chunk).get(),
          ])
          legacy.forEach(d => byDoc.set(d.id, d.data()))
          tagged.forEach(d => byDoc.set(d.id, d.data()))
        }
        const oEntries = [...byDoc.values()]
        const lines = allOrders.map(o => {
          const chain = computeOrderChain(o, oEntries, opById, departments, { allOrders })
          const bn = chain.depts.find(d => d.bottleneck)?.bottleneck
          const opbnDept = chain.depts.find(d => d.opBottleneck)
          let line = `${chain.done ? '✅' : '🔄'} *${o.name}* — ${chain.doneQty}/${chain.orderQty} (${chain.percent}%)`
          if (bn && !chain.done) line += `\n   ⚠️ Bo'lim: ${bn.name} (${bn.qty})`
          if (opbnDept && !chain.done) line += `\n   ⚠️ Operatsiya: ${opbnDept.name} — ${opbnDept.opBottleneck.name} (${opbnDept.opBottleneck.qty})`
          const f = forecastOrder(o, chain.doneQty)
          if (f && !f.done && !chain.done) line += `\n   📈 Taxminan: ${f.date} (${f.daysLeft} kun)`
          return line
        })
        if (lines.length) orderLines = `\n\n📦 *Buyurtmalar holati:*\n` + lines.join('\n')
      }
    } catch (_) { /* buyurtma tizimi bo'lmasa e'tibor bermaymiz */ }

    const message =
      `🏭 *KAFTIMDA — Kunlik Xisobot*\n` +
      `📅 ${dateFormatted}\n\n` +
      `📊 *Umumiy ko'rsatkichlar:*\n` +
      `👥 Kelgan: ${totalAttended}/${totalEmp} xodim\n` +
      `${overallEmoji} Samaradorlik: ${totalEff !== null ? totalEff + '%' : 'Ma\'lumot yo\'q'}\n` +
      `📦 Tayyor mahsulot: ${totalTayyor} dona\n\n` +
      `*Bo'limlar holati:*\n` +
      (deptLines || '⚪ Bugun ma\'lumot kiritilmagan') +
      orderLines +
      `\n\n_KAFTIMDA ishlab chiqarish tizimi_`

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    )

    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram error: ${JSON.stringify(tgData)}`)

    return res.json({ ok: true, date: today, sent: true })
  } catch (err) {
    console.error('[daily-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
`````


## `ishlab-chiqarish/api/send-telegram-pdf.js`

`````js
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdf, filename = 'hisobot.pdf', caption = '' } = req.body
    if (!pdf) return res.status(400).json({ error: 'PDF data missing' })

    const buffer = Buffer.from(pdf, 'base64')

    const formData = new FormData()
    formData.append('chat_id', process.env.TELEGRAM_CHAT_ID)
    formData.append('document', new Blob([buffer], { type: 'application/pdf' }), filename)
    if (caption) formData.append('caption', caption)

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: formData }
    )

    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram: ${tgData.description || JSON.stringify(tgData)}`)

    return res.json({ ok: true })
  } catch (err) {
    console.error('[send-telegram-pdf]', err)
    return res.status(500).json({ error: err.message })
  }
}
`````


## `ishlab-chiqarish/api/html-to-telegram-pdf.js`

`````js
export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { html, filename = 'hisobot.pdf', caption = '', threadId } = req.body
  if (!html) return res.status(400).json({ ok: false, error: 'HTML missing' })

  let browser
  try {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1150, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '8mm', right: '10mm', bottom: '8mm', left: '10mm' },
      printBackground: true,
    })

    // Send directly to Telegram — PDF never goes back to client
    const formData = new FormData()
    formData.append('chat_id', process.env.TELEGRAM_CHAT_ID)
    // Bo'lim mavzusi (forum topic) berilgan bo'lsa — xabar o'sha mavzuga boradi
    if (threadId) formData.append('message_thread_id', String(threadId))
    formData.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), filename)
    if (caption) formData.append('caption', caption)

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: formData }
    )
    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram: ${tgData.description || JSON.stringify(tgData)}`)

    return res.json({ ok: true })
  } catch (err) {
    console.error('[html-to-telegram-pdf]', err)
    return res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (browser) await browser.close()
  }
}
`````


## `ishlab-chiqarish/api/html-to-pdf.js`

`````js
export const config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { html } = req.body
  if (!html) return res.status(400).json({ error: 'HTML missing' })

  let browser
  try {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1150, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '8mm', right: '10mm', bottom: '8mm', left: '10mm' },
      printBackground: true,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.send(pdf)
  } catch (err) {
    console.error('[html-to-pdf]', err)
    res.status(500).json({ error: err.message })
  } finally {
    if (browser) await browser.close()
  }
}
`````


## `ishlab-chiqarish/api/weekly-employee-report.js`

`````js
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function getPrevWeekRange() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000) // Tashkent UTC+5
  // Cron shanba kuni ishlaydi — o'tgan shanba (−7) dan o'tgan juma (−1) gacha
  const pad = n => String(n).padStart(2, '0')
  const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)

  const prevSaturday = new Date(today)
  prevSaturday.setUTCDate(today.getUTCDate() - 7)

  const prevFriday = new Date(today)
  prevFriday.setUTCDate(today.getUTCDate() - 1)

  const monthName = prevSaturday.toLocaleString('uz-UZ', { month: 'long' })
  const label = `${prevSaturday.getUTCDate()}–${prevFriday.getUTCDate()} ${monthName}`

  return { from: fmt(prevSaturday), to: fmt(prevFriday), label }
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const { from, to, label } = getPrevWeekRange()

    const [empSnap, entriesSnap, absSnap] = await Promise.all([
      db.collection('factory_employees').where('isActive', '!=', false).get(),
      db.collection('factory_work_entries').where('date', '>=', from).where('date', '<=', to).get(),
      db.collection('factory_absences').where('date', '>=', from).where('date', '<=', to).get(),
    ])

    const empMap = {}
    empSnap.docs.forEach(d => { empMap[d.id] = { id: d.id, ...d.data() } })

    const absMap = {}
    absSnap.docs.forEach(d => {
      const a = d.data()
      if (!absMap[a.employeeId]) absMap[a.employeeId] = 0
      absMap[a.employeeId]++
    })

    const summary = {}
    entriesSnap.docs.forEach(d => {
      const e = d.data()
      const empId = e.employeeId
      if (!empMap[empId]) return
      if (!summary[empId]) summary[empId] = { totalDays: 0, totalHours: 0, totalQty: 0, totalPay: 0 }
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)

      // Ishlagan soatni hisoblash
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(':').map(Number)
        const [eh, em] = e.endTime.split(':').map(Number)
        const hrs = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60 - (e.breakMinutes || 0) / 60)
        summary[empId].totalHours += hrs
      }

      Object.values(e.operations || {}).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
      })
    })

    const results = []
    for (const [empId, s] of Object.entries(summary)) {
      const emp = empMap[empId]
      if (!emp?.telegramId) continue
      const absents = absMap[empId] || 0

      let msg = `📈 <b>Haftalik hisobot (${label})</b>\n`
      msg += `👤 <b>${emp.lastName} ${emp.firstName}</b>\n\n`
      msg += `📅 Ish kunlari: ${s.totalDays}\n`
      msg += `⏱ Jami soat: ${s.totalHours.toFixed(1)} soat\n`
      msg += `📦 Bajarilgan: ${s.totalQty.toLocaleString()} dona\n`
      if (absents > 0) msg += `❌ Kelmagan: ${absents} kun\n`
      if (s.totalPay > 0) msg += `\n💰 Haftalik maosh: <b>${s.totalPay.toLocaleString()} so'm</b>`

      try {
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: emp.telegramId, text: msg, parse_mode: 'HTML' }),
          }
        )
        results.push({ empId, sent: true })
      } catch (e) {
        results.push({ empId, sent: false, error: e.message })
      }
    }

    return res.json({ ok: true, week: label, sent: results.length })
  } catch (err) {
    console.error('[weekly-employee-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
`````


## `ishlab-chiqarish/api/monthly-employee-report.js`

`````js
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function getPrevMonthRange() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000) // Tashkent UTC+5
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth()
  const pad = n => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: new Date(year, month - 1, 1).toLocaleString('uz-UZ', { month: 'long', year: 'numeric' }),
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const { from, to, label } = getPrevMonthRange()

    const [empSnap, entriesSnap, absSnap] = await Promise.all([
      db.collection('factory_employees').where('isActive', '!=', false).get(),
      db.collection('factory_work_entries').where('date', '>=', from).where('date', '<=', to).get(),
      db.collection('factory_absences').where('date', '>=', from).where('date', '<=', to).get(),
    ])

    const empMap = {}
    empSnap.docs.forEach(d => { empMap[d.id] = { id: d.id, ...d.data() } })

    const absMap = {}
    absSnap.docs.forEach(d => {
      const a = d.data()
      if (!absMap[a.employeeId]) absMap[a.employeeId] = 0
      absMap[a.employeeId]++
    })

    const summary = {}
    entriesSnap.docs.forEach(d => {
      const e = d.data()
      const empId = e.employeeId
      if (!empMap[empId]) return
      if (!summary[empId]) summary[empId] = { totalDays: 0, totalQty: 0, totalExp: 0, totalPay: 0 }
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)
      Object.values(e.operations || {}).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
        summary[empId].totalExp += Number(op.expected || 0)
      })
    })

    const results = []
    for (const [empId, s] of Object.entries(summary)) {
      const emp = empMap[empId]
      if (!emp?.telegramId) continue
      const absents = absMap[empId] || 0

      let msg = `📊 <b>${label} — oylik hisobot</b>\n`
      msg += `👤 <b>${emp.lastName} ${emp.firstName}</b>\n\n`
      msg += `📅 Ish kunlari: ${s.totalDays}\n`
      msg += `📦 Bajarilgan: ${s.totalQty.toLocaleString()} dona\n`
      if (absents > 0) msg += `❌ Kelmagan: ${absents} kun\n`
      if (s.totalPay > 0) msg += `\n💰 Jami maosh: <b>${s.totalPay.toLocaleString()} so'm</b>`

      try {
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: emp.telegramId, text: msg, parse_mode: 'HTML' }),
          }
        )
        results.push({ empId, sent: true })
      } catch (e) {
        results.push({ empId, sent: false, error: e.message })
      }
    }

    return res.json({ ok: true, month: label, sent: results.length })
  } catch (err) {
    console.error('[monthly-employee-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
`````


## `ishlab-chiqarish/api/send-message.js`

`````js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { chatId, text } = req.body
  if (!chatId || !text) return res.status(400).json({ ok: false, error: 'chatId and text required' })

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      }
    )
    const data = await tgRes.json()
    if (!data.ok) throw new Error(data.description || JSON.stringify(data))
    return res.json({ ok: true })
  } catch (err) {
    console.error('[send-message]', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
`````

