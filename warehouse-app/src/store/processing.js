import { getData, saveData } from './storage'

export const getProcessing = (uid) => getData('processing', uid)
export const saveProcessing = (uid, list) => saveData('processing', uid, list)
