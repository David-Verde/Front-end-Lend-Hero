import { create } from 'zustand';

interface GroupStore {
  groups: any[];
  setGroup: (groups: any[]) => void;
}

const groupStore = create<GroupStore>()((set) => ({
  groups: [], // Inicializa como un array vacío
  setGroup: (groups) => set(() => ({ groups })), // Asegúrate de que groups sea un array
}));

export default groupStore;