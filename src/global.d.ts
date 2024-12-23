import { TokenSet } from "openid-client"

declare global {
  namespace Express {
    interface User {
      id: string
      lang?: string
      tokenset: TokenSet
    }
  }
}
