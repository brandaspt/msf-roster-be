import { TokenSet } from "openid-client"

export {}

declare global {
  namespace Express {
    interface User {
      id: string
      lang?: string
      tokenset: TokenSet
    }
  }
}
