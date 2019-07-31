const knex = require('knex');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Authorization Endpoints', function() {
  let db;

  const { testUsers } = helpers.makeThingsFixtures();
  const testUser = testUsers[0];

  before('make knex instance', ()=> {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });
  after('disconnect from db', ()=> db.destroy());
  before('cleanup', ()=> helpers.cleanTables(db));
  afterEach('cleanup', ()=> helpers.cleanTables(db));

  describe('POST /api/auth/login', ()=> {
    beforeEach('insert users', ()=> {
      helpers.seedUsers(db, testUsers);
    });

    const requiredFields = ['user_name', 'password'];

    requiredFields.forEach(field=> {
      const loginAttemptBody = { 
        user_name: testUser.user_name,
        password: testUser.password
      };

      it(`should respond with 400 when missing '${field}'`, ()=> {
        loginAttemptBody[field] = null;

        return supertest(app)
          .post('/api/auth/login')
          .send(loginAttemptBody)
          .expect(400, {
            error: `Missing '${field}' in request body`
          });
      });
    });

    it('should respond with 400 and invalid username or password message when bad username', ()=> {
      const invalidUser= { user_name:'user-not-valid', password: 'existy'};
      
      return supertest(app)
        .post('/api/auth/login')
        .send(invalidUser)
        .expect(400, {
          error: 'Incorrect user_name or password'
        });
    });

    it('should respond 400 and invalid username or password message when bad password', ()=> {
      const invalidUser = {user_name: testUser.user_name, password: 'incorrectPassword'};

      return supertest(app)
        .post('/api/auth/login')
        .send(invalidUser)
        .expect(400, {error: 'Incorrect user_name or password'});
    });

    it('should respond 200 and JWT auth token using secret when valid credentials', ()=> {
      const validUser = { 
        user_name: testUser.user_name,
        password: testUser.password
      };

      const expectedToken = jwt.sign(
        { user_id: testUser.id }, //payload
        process.env.JWT_SECRET, //jwtsecret
        {
          subject: testUser.user_name,
          algorithm: 'HS256'
        }
      );
      return supertest(app)
        .post('/api/auth/login')
        .send(validUser)
        .expect(200, {
          authToken: expectedToken
        });
    });
  });
});