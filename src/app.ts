import express from "express"
import { IdTokenClaims, Issuer, Strategy, TokenSet } from "openid-client"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import session from "express-session"
import passport from "passport"
import { RedisStore } from "connect-redis"
import { createClient } from "redis"
import { envVars } from "./config"
import { handleMyRoster } from "./handlers/my-roster"
import cors from "cors"
import { handleMyCard } from "./handlers/my-card"

const PORT = 5001
const SCOPE = "m3p.f.pr.pro m3p.f.pr.ros openid offline"

// Helper function to convert an OAuth2/OpenID response to a user
function tokensToUser(tokenset: TokenSet, claims: IdTokenClaims, done) {
  const { sub, lang } = claims
  const user = { id: sub, lang, tokenset }
  done(null, user)
}

// Helper function to convert a user into a JSON.stringify-able object
function userToStoredUser(user, cb) {
  const storedUser = user
  cb(null, storedUser)
}

// Helper function to convert a JSON.parsed object to a user
function storedUserToUser(storedUser, cb) {
  try {
    const tokenset = new TokenSet(storedUser.tokenset)
    const user = { ...storedUser, tokenset }
    cb(null, user)
  } catch (e) {
    cb(e)
  }
}

const init = async () => {
  const msfIssuer = await Issuer.discover(envVars.MSF_AUTH_URL)

  const client = new msfIssuer.Client({
    client_id: envVars.CLIENT_ID,
    client_secret: envVars.CLIENT_SECRET,
    redirect_uris: [envVars.APP_CALLBACK_URL]
  })

  const strategy = new Strategy(
    { client, params: { scope: SCOPE } },
    tokensToUser
  )
  passport.use("msf", strategy)
  passport.serializeUser(userToStoredUser)
  passport.deserializeUser(storedUserToUser)

  const app = express()

  // Initialize Redis client.
  const redisClient = createClient()
  try {
    await redisClient.connect()
    // Initialize Redis store.
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: "myapp:"
    })
    const sessionHandler = session({
      store: redisStore,
      resave: false, // required: force lightweight session keep alive (touch)
      saveUninitialized: false, // recommended: only save session when data exists
      secret: envVars.SESSION_SECRET,
      name: "msf-demo",
      cookie: {
        maxAge: 3 * 60 * 60 * 1000, // 3 hours
        secure: "auto"
      }
    })
    app.use(sessionHandler)
  } catch (error) {
    console.log(error)
  }
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(
    cors({
      origin: "http://localhost:3000", // Replace with your frontend URL
      credentials: true // Allow cookies to be sent
    })
  )

  app.get("/", async (req, res) => {
    res.send("Hello")
  })

  app.get("/my-roster", handleMyRoster)
  app.get("/my-card", handleMyCard)

  app.get("/login", passport.authenticate("msf"))
  app.get(
    "/callback",
    passport.authenticate("msf", {
      failureRedirect: envVars.FRONTEND_ROOT_URL,
      successRedirect: envVars.FRONTEND_ROOT_URL
    })
  )

  // app.get("/logout", (req, res) => {
  //   req.logout(() => {
  //     res.redirect(
  //       client.buildEndSessionUrl(config, {
  //         post_logout_redirect_uri: `${req.protocol}://${req.host}`
  //       }).href
  //     )
  //   })
  // })

  app.listen(PORT, () => {
    return console.log(`Express is listening at http://localhost:${PORT}`)
  })
}
init()
