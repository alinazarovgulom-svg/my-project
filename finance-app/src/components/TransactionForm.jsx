import React, { useState, useEffect } from 'react';

const CATEGORIES = {
  expense: ['Oziq-ovqat', 'Transport', 'Ko\'ngilochar', 'Sog\'liqni saqlash', 'Ta\'lim', 'Uy-joy', 'Kiyim-kechak', 'Kommunal', 'Boshqa'],
  income: ['Maosh', 'Freelance', 'Biznes', 'Investitsiya', 'Sovg\'a', 'Boshqa']
};

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'];

export default function TransactionForm({ onSubmit, onCancel, initial }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    currency: 'UZS',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    ...initial
  });

  useEffect(() => {
    if (initial) setForm({ ...form, ...initial });
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'type') setForm(prev => ({ ...prev, type: value, category: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.category) return;
    onSubmit({ ...form, amount: parseFloat(form.amount) });
  };

  const cats = CATEGORIES[form.type] || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex rounded-xl overflow-hidden border border-gray-600">
          <button type="button" onClick={() => setForm(p => ({ ...p, type: 'expense', category: '' }))}
            className={`flex-1 py-3 font-semibold transition-colors ${form.type === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            Xarajat
          </button>
          <button type="button" onClick={() => setForm(p => ({ ...p, type: 'income', category: '' }))}
            className={`flex-1 py-3 font-semibold transition-colors ${form.type === 'income' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            Daromad
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label">Miqdor</label>
          <input type="number" name="amount" value={form.amount} onChange={handleChange}
            placeholder="0.00" min="0" step="any" required
            className="input-field" />
        </div>
        <div className="w-28">
          <label className="label">Valyuta</label>
          <select name="currency" value={form.currency} onChange={handleChange} className="input-field">
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Kategoriya</label>
        <select name="category" value={form.category} onChange={handleChange} required className="input-field">
          <option value="">Tanlang...</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Izoh</label>
        <input type="text" name="description" value={form.description} onChange={handleChange}
          placeholder="Ixtiyoriy izoh..." className="input-field" />
      </div>

      <div>
        <label className="label">Sana</label>
        <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Bekor</button>
        <button type="submit" className="btn-primary flex-1">Saqlash</button>
      </div>
    </form>
  );
}
