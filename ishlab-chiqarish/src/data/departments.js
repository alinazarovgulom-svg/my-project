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
