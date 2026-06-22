const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// In-memory data store
let employees = [
  {
    id: uuidv4(),
    name: "Alisher Karimov",
    position: "Dasturchi",
    department: "IT",
    baseSalary: 5000000,
    joinDate: "2022-03-15",
    status: "active"
  },
  {
    id: uuidv4(),
    name: "Malika Yusupova",
    position: "Buxgalter",
    department: "Moliya",
    baseSalary: 4000000,
    joinDate: "2021-07-01",
    status: "active"
  },
  {
    id: uuidv4(),
    name: "Bobur Toshmatov",
    position: "Menejer",
    department: "Sotish",
    baseSalary: 4500000,
    joinDate: "2023-01-10",
    status: "active"
  }
];

let payrollRecords = [];
let attendanceRecords = [];

// ─── Employee Routes ───────────────────────────────────────────────────────────
app.get('/api/employees', (req, res) => res.json(employees));

app.post('/api/employees', (req, res) => {
  const emp = { id: uuidv4(), status: 'active', ...req.body };
  employees.push(emp);
  io.emit('employees:updated', employees);
  res.status(201).json(emp);
});

app.put('/api/employees/:id', (req, res) => {
  const idx = employees.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Topilmadi' });
  employees[idx] = { ...employees[idx], ...req.body };
  io.emit('employees:updated', employees);
  res.json(employees[idx]);
});

app.delete('/api/employees/:id', (req, res) => {
  employees = employees.filter(e => e.id !== req.params.id);
  io.emit('employees:updated', employees);
  res.json({ success: true });
});

// ─── Attendance Routes ─────────────────────────────────────────────────────────
app.get('/api/attendance', (req, res) => res.json(attendanceRecords));

app.post('/api/attendance', (req, res) => {
  const record = { id: uuidv4(), ...req.body };
  attendanceRecords.push(record);
  io.emit('attendance:updated', attendanceRecords);
  res.status(201).json(record);
});

app.put('/api/attendance/:id', (req, res) => {
  const idx = attendanceRecords.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Topilmadi' });
  attendanceRecords[idx] = { ...attendanceRecords[idx], ...req.body };
  io.emit('attendance:updated', attendanceRecords);
  res.json(attendanceRecords[idx]);
});

// ─── Payroll Routes ────────────────────────────────────────────────────────────
app.get('/api/payroll', (req, res) => res.json(payrollRecords));

app.post('/api/payroll/calculate', (req, res) => {
  const { month, year } = req.body;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const calculated = employees
    .filter(e => e.status === 'active')
    .map(emp => {
      const att = attendanceRecords.find(
        a => a.employeeId === emp.id && a.month === monthKey
      );

      const workDays = att?.workDays ?? 22;
      const overtimeHours = att?.overtimeHours ?? 0;
      const bonus = att?.bonus ?? 0;
      const deductions = att?.deductions ?? 0;

      const dailyRate = emp.baseSalary / 22;
      const overtimePay = (dailyRate / 8) * 1.5 * overtimeHours;
      const incomeTax = (emp.baseSalary + bonus + overtimePay) * 0.12;
      const pensionFund = emp.baseSalary * 0.08;
      const grossSalary = (dailyRate * workDays) + overtimePay + bonus;
      const totalDeductions = incomeTax + pensionFund + deductions;
      const netSalary = grossSalary - totalDeductions;

      return {
        id: uuidv4(),
        employeeId: emp.id,
        employeeName: emp.name,
        position: emp.position,
        department: emp.department,
        month: monthKey,
        baseSalary: emp.baseSalary,
        workDays,
        overtimeHours,
        overtimePay: Math.round(overtimePay),
        bonus,
        grossSalary: Math.round(grossSalary),
        incomeTax: Math.round(incomeTax),
        pensionFund: Math.round(pensionFund),
        deductions,
        totalDeductions: Math.round(totalDeductions),
        netSalary: Math.round(netSalary),
        status: 'calculated',
        calculatedAt: new Date().toISOString()
      };
    });

  // Remove old records for this month and add new ones
  payrollRecords = payrollRecords.filter(r => r.month !== monthKey);
  payrollRecords.push(...calculated);

  io.emit('payroll:updated', payrollRecords);
  res.json(calculated);
});

app.put('/api/payroll/:id/approve', (req, res) => {
  const idx = payrollRecords.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Topilmadi' });
  payrollRecords[idx].status = 'approved';
  payrollRecords[idx].approvedAt = new Date().toISOString();
  io.emit('payroll:updated', payrollRecords);
  res.json(payrollRecords[idx]);
});

// ─── Stats ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const totalEmployees = employees.filter(e => e.status === 'active').length;
  const totalPayroll = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthPayroll = payrollRecords
    .filter(r => r.month === currentMonth)
    .reduce((sum, r) => sum + r.netSalary, 0);

  res.json({ totalEmployees, totalPayroll, monthPayroll, totalRecords: payrollRecords.length });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Client ulandi:', socket.id);
  socket.emit('employees:updated', employees);
  socket.emit('attendance:updated', attendanceRecords);
  socket.emit('payroll:updated', payrollRecords);

  socket.on('disconnect', () => console.log('Client uzildi:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ishga tushdi: http://localhost:${PORT}`));
