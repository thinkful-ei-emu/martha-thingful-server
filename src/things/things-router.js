const express = require('express')
const ThingsService = require('./things-service')
const { requireAuth } = require('../middleware/jwt-auth')

const thingsRouter = express.Router()

thingsRouter
  .route('/')
  .get((req, res, next) => {
    ThingsService.getAllThings(req.app.get('db'))
      .then(things => {
        res.json(ThingsService.serializeThings(things))
      })
      .catch(next)
  })

thingsRouter
  .route('/:thing_id')
  .all(requireAuth)
  .all(checkThingExists)
  .get((req, res) => {
    res.json(ThingsService.serializeThing(res.thing))
  })

thingsRouter.route('/:thing_id/reviews/')
  .all(requireAuth)
  .all(checkThingExists)
  .get((req, res, next) => {
    ThingsService.getReviewsForThing(
      req.app.get('db'),
      req.params.thing_id
    )
      .then(reviews => {
        res.json(ThingsService.serializeThingReviews(reviews))
      })
      .catch(next)
  })

/* async/await syntax for promises */
async function checkThingExists(req, res, next) {
  try {
    const thing = await ThingsService.getById(
      req.app.get('db'),
      req.params.thing_id
    )

    if (!thing)
      return res.status(404).json({
        error: `Thing doesn't exist`
      })

    res.thing = thing
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = thingsRouter
