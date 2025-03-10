import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface GroupStore {
  groups: any[];
  setGroup: (groups: any[]) => void;
}

const useGroupStore = create<GroupStore>()(
  devtools(
    persist(
      (set) => ({
        groups: [], // Inicializa como un array vacío
        setGroup: (groups) => set(() => ({ groups })), // Asegúrate de que groups sea un array
      }),
      {
        name: 'GroupStore', // Nombre para el almacenamiento persistente
      }
    )
  )
);

export default useGroupStore;
  