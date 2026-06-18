import { getData, saveData } from './storage'

export const getSuppliers = (uid) => getData('suppliers', uid)
export const saveSuppliers = (uid, list) => saveData('suppliers', uid, list)
export const getSupplierTxns = (uid) => getData('supplier_txns', uid)
export const saveSupplierTxns = (uid, list) => saveData('supplier_txns', uid, list)

export const getBalance = (txns, supplierId) =>
  txns
    .filter(t => t.supplierId === supplierId)
    .reduce((sum, t) => (t.type === 'debt' ? sum + t.amount : sum - t.amount), 0)
