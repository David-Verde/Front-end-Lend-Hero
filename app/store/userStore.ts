import { create } from 'zustand'
import { User } from './types'

interface UserStore {
user : User
    setUser: (user: any) => void
}

const userStore = create<UserStore>()((set) => ({
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
    setUser: (user: any) => set(() => ({ ...user }))
}))

export default userStore
