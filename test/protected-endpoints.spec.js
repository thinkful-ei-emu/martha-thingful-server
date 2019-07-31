const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Protected Endpoints', function() {
  let db;

  const { 
    testUsers, 
    testThings, 
    testReviews,
  } = helpers.makeThingsFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  beforeEach('insert things', ()=> 
    helpers.seedThingsTables(
      db,
      testUsers,
      testThings,
      testReviews
    )
  );

  const protectedEndpoints = [
    {
      name: 'GET /api/things/:thing_id',
      path: '/api/things/1',
      method: supertest(app).get
    },
    {
      name: 'GET /api/things/:thing_id/reviews',
      path: '/api/things/1/reviews',
      method: supertest(app).get
    },
    {
      name: 'POST /api/reviews',
      path: '/api/reviews',
      method: supertest(app).post
    }
  ];

  protectedEndpoints.forEach(endpoint => {
    describe(endpoint.name, ()=> {
      it('should respond with 401 and \'Missing basic token\'', ()=> {
        return endpoint.method(endpoint.path)
          .expect(401, { error: 'Missing basic token'});
      });
      
      it('should respond with 401 "Unauthoized request" when invalid jwt secret', ()=> {
        const validUser = testUsers[0];
        const invalidSecret = 'bad-secret';
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(validUser, invalidSecret))
          .expect(401, { error: 'Unauthorized request'});
      });
  
      it('should respond 401 "Unauthorized request" when invalid sub in payload', ()=> {
        const invalidUser = { user_name: 'user-not', id: 1};
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(invalidUser))
          .expect(401, { error: 'Unauthorized request'});
      });
    });
  });
});