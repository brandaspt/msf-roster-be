// Includes
import { TokenSet } from "openid-client"
import { envVars } from "./config"
import { Request } from "express"

// The root part of all MSF API URLs

// Helper function to encode client id and secret
const formUrlEncode = (value: string) =>
  encodeURIComponent(value).replace(/%20/g, "+")

// Helper function to save a user after updating their tokens
const saveUser = req => {
  return new Promise<void>((resolve, reject) => {
    req.login(req.user, function (err) {
      if (err) {
        return reject(err)
      }
      return resolve()
    })
  })
}

// Pre-calculate the value of the authorization header we'll use to authenticate
// our client to the api each time we need to refresh a token.
const CLIENT_AUTH = `Basic ${Buffer.from(
  `${formUrlEncode(envVars.CLIENT_ID)}:${formUrlEncode(envVars.CLIENT_SECRET)}`
).toString("base64")}`

// Helper function to call an API route's method with a given player's access_token.
const _apiFetch = async (
  route: string,
  method: string,
  access_token: string
) => {
  return fetch(envVars.MSF_API_ROOT + route, {
    method,
    headers: {
      "x-api-key": envVars.MSF_API_KEY,
      authorization: "Bearer " + access_token
    }
  })
}

export const fetchForServer = async (route: string, method = "get") => {
  const resp = await fetch(
    "https://hydra-public.prod.m3.scopelypv.com/oauth2/token",
    {
      method: "post",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "m3p.f.pr.inv openid offline"
      }),
      headers: {
        authorization: CLIENT_AUTH
      }
    }
  )

  const { access_token: accessToken } = await resp.json()
  return _apiFetch(route, method, accessToken)
}

export const fetchForReq = async (
  req: Request,
  route: string,
  method = "get",
  persistNewTokenSet = true
) => {
  // Get tokens from the req.user object.
  const tokenset = req.user?.tokenset

  // If there's no access_token, abort early.
  if (!tokenset?.access_token) throw new Error("Missing access_token.")

  // Step 1: Make the initial attempt.
  const response1 = await _apiFetch(route, method, tokenset.access_token)

  // If it's not a 403, this response is as good as it's gonna get at this level.
  if (response1.status !== 403) return response1

  // If we don't have a refresh_token, we also can't improve things.
  if (!tokenset.refresh_token) return response1

  // Step 2: Try to refresh the tokens.
  const response2 = await fetch(
    envVars.MSF_API_ROOT + "/util/v1/gatedRefresh",
    {
      method: "post",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: envVars.CLIENT_ID,
        redirect_uri: envVars.APP_CALLBACK_URL,
        refresh_token: tokenset.refresh_token
      }),
      headers: {
        "x-api-key": envVars.MSF_API_KEY,
        authorization: CLIENT_AUTH
      }
    }
  )

  // If our refresh attempt was gated, inform the caller by returning this 473.
  if (response2.status === 473) return response2

  // If the refresh attempt failed for other reasons, go with the initial response.
  if (!response2.ok) return response1

  // If we get here, we have a new tokenset. Set it for this request.
  const json = await response2.json()
  const newtokenset = new TokenSet(json)
  req.user.tokenset = newtokenset

  // Also, persist it to the player's session, if desired.
  if (persistNewTokenSet) {
    await saveUser(req)
  }

  // Step 3: Re-attempt the API call.
  const response3 = await _apiFetch(route, method, newtokenset.access_token)

  // Return whatever we got.
  return response3
}
