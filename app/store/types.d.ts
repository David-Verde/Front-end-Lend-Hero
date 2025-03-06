export interface User {
        _id: string
        name: string
        email: string
        fcmToken: any
        loansGiven: any[]
        loansReceived: any[]
        groups: string[]
        createdAt: string
        __v: number
}



export interface Group {
        _id: string
        name: string
        description: string
        admin: Admin
        members: Member[]
        loans: any[]
        createdAt: string
        __v: number
      }
      
      export interface Admin {
        _id: string
        name: string
        email: string
      }
      
      export interface Member {
        user?: User
        role: string
        _id: string
      }
      
      export interface User {
        _id: string
        name: string
        email: string
      }
      