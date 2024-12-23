import { Response } from "express"
import { Request } from "express-serve-static-core"
import { fetchForReq, fetchForServer } from "../msf-api"

type Character = {
  id: string
  portrait: string
  name: string
}

type RosterCharacter = {
  id: string
  level: number
  power: number
}

export const handleMyRoster = async (req: Request, res: Response) => {
  const [rosterResp, charsResp] = await Promise.all([
    fetchForReq(req, "/player/v1/roster"),
    fetchForServer("/game/v1/characters")
  ])

  if (!rosterResp.ok) {
    res.sendStatus(rosterResp.status)
    return
  }
  if (!charsResp.ok) {
    res.sendStatus(500)
    return
  }

  const [rosterData, charsData] = await Promise.all([
    rosterResp.json(),
    charsResp.json()
  ])

  const rosterChars: RosterCharacter[] = rosterData?.data ?? []
  const chars: Character[] = charsData?.data ?? []

  const normalizedData = rosterChars.map(({ id, level, power }) => {
    const { portrait = "", name } = chars.find(c => c.id === id) ?? {}
    return { id, level, power, portrait, name }
  })

  res.send(normalizedData)
}
