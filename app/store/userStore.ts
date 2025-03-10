import { create } from 'zustand'
import { User } from './types'
import { devtools, persist } from 'zustand/middleware'

interface UserStore {
  user: User;
  setUser: (user: User) => void;
}

const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        user: {
          _id: '',
          name: '',
          email: '',
          fcmToken: undefined,
          loansGiven: [],
          loansReceived: [],
          groups: [],
          createdAt: '',
          __v: 0
        },
        setUser: (user: User) => set(() => ({ user }))
      }),
      {
        name: 'UserStore',
      }
    )
  )
);

export default useUserStore;
