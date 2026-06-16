import React, { useState, useEffect } from 'react';

export default function DebtForm({ onSubmit, onCancel, initial }) {
  const [form, setForm] = useState({
    type: 'given', // given = men berdim, received = men oldim
    personName: '',
    amount: '',
    currency: 'UZS',
    description: '',
    dueDate: '',
    date: new Date().toISOString().split('T')[0],
    ...initial
  });

  useEffect(() => {
    if (initial) setForm(prev => ({ ...prev, ...initial }));
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.personName || !form.amount) return;
    onSubmit({ ...form, amount: parseFloat(form.amount), paidAmount: initial?.paidAmount || 0, status: 'active' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex rounded-xl overflow-hidden border border-gray-600">
          <button type="button" onClick={() => setForm(p => ({ ...p, type: 'given' }))}
            className={`flex-1 py-3 font-semibold transition-colors ${form.type === 'given' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            Men berdim
          </button>
          <button type="button" onClick={() => setForm(p => ({ ...p, type: 'received' }))}
            className={`flex-1 py-3 font-semibold transition-colors ${form.type === 'received' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            Men oldim
          </button>
        </div>
      </div>

      <div>
        <label className="label">Shaxs ismi</label>
        <input type="text" name="personName" value={form.personName} onChange={handleChange}
          placeholder="Ism familiya..." required className="input-field" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label">Miqdor</label>
          <input type="number" name="amount" value={form.amount} onChange={handleChange}
            placeholder="0.00" min="0" step="any" required className="input-field" />
        </div>
        <div className="w-28">
          <label className="label">Valyuta</label>
          <select name="currency" value={form.currency} onChange={handleChange} className="input-field">
            {['UZS', 'USD', 'EUR', 'RUB'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Izoh</label>
        <input type="text" name="description" value={form.description} onChange={handleChange}
          placeholder="Qarz sababi..." className="input-field" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label">Sana</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" />
        </div>
        <div className="flex-1">
          <label className="label">Muddati</label>
          <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="input-field" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Bekor</button>
        <button type="submit" className="btn-primary flex-1">Saqlash</button>
      </div>
    </form>
  );
}
