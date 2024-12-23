import { Request, Response } from "express"
import { fetchForReq } from "../msf-api"

export const handleMyCard = async (req: Request, res: Response) => {
  const resp = await fetchForReq(req, "/player/v1/card")

  if (!resp.ok) {
    res.sendStatus(resp.status)
    return
  }

  const { data } = await resp.json()
  res.send(data)
}
