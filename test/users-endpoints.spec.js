/* eslint-disable no-undef */
const knex = require('knex');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe.only('Users Endpoints', function() {
  let db;

  const { testUsers } = helpers.makeThingsFixtures();
  const testUser = testUsers[0];

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

  describe('POST /api/users', ()=> {
    context('User Validation', ()=> {
      //adds users to testdatabase before each test in this describe block
      beforeEach('insert users', ()=> 
        helpers.seedUsers(
          db,
          testUsers
        )
      );

      const requiredFields = ['user_name', 'password', 'full_name'];

      requiredFields.forEach(field => {
        const registerAttemptBody = {
          user_name: 'test user',
          password: 'test password', 
          full_name: 'test fullname',
          nickname: 'test nickname'
        };

        it(`should respoond with 400 and error message when required ${field} is missing`, () => {
          delete registerAttemptBody[field];
          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`
            });
        });

        it('should respond with 400 when password less than 8 characters', ()=> {
          const shortPass = { 
            user_name: 'test user', 
            password: 'short', 
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(shortPass)
            .expect(400, {
              error: 'Password must be more than 8 characters'
            });
        });

        it('should respond with 400 when password more than 72 characters', ()=> {
          const longPass = { 
            user_name: 'test user', 
            password: '*'.repeat(73), 
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(longPass)
            .expect(400, {
              error: 'Password must be less than 72 characters'
            });
        });

        it('should respond with 400 and error if spaces infront of password', () => {
          const spacePass = { 
            user_name: 'test user',
            password: ' spacessss', 
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(spacePass)
            .expect(400, {
              error: 'Password must not start or end with a space'
            });
        });

        it('should respond with 400 and error if spaces behind password', () => {
          const spacePass = { 
            user_name: 'test user',
            password: 'spacessss ', 
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(spacePass)
            .expect(400, {
              error: 'Password must not start or end with a space'
            });
        });

        it('should respond with 400 and error when password is not complex', ()=> {
          const userNotComplex = {
            user_name: 'test user', 
            password: 'notcomplex', 
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(userNotComplex)
            .expect(400, {
              error: 'Password must contain at least 1 upper case, lower case, number and special character'
            });
        });

        it('should respond with 400 and error if duplicate username', ()=> {
          const duplicateUser = {
            user_name: testUser.user_name,
            password: '123abcDEF!!',
            full_name: 'test name'
          };
          return supertest(app)
            .post('/api/users')
            .send(duplicateUser)
            .expect(400, {
              error: 'Username already taken'
            });
        });
      });
    });

    context('Happy case', ()=> {
      it('should respond with 201, and store the user and password', ()=> {
        const newUser = {
          user_name: 'test user name', 
          password: '123abcDEF!!!', 
          full_name: 'test full name'
        };
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id');
            expect(res.body.user_name).to.eql(newUser.user_name);
            expect(res.body.full_name).to.eql(newUser.full_name);
            expect(res.body.nickname).to.eql('');
            expect(res.body).to.not.have.property('password');
            expect(res.header.location).to.eql(`/api/users/${res.body.id}`);
            const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC'});
            const actualDate = new Date(res.body.date_created).toLocaleString();
            expect(actualDate).to.eql(expectedDate);
          })
          .expect(res => 
            db
              .from('thingful_users')
              .select('*')
              .where({id: res.body.id})
              .first()
              .then(row=> {
                expect(row.user_name).to.eql(newUser.user_name);
                expect(row.full_name).to.eql(newUser.full_name);
                expect(row.nickname).to.eql(null);
                const expectedDate = new Date().toLocaleString('en', {timeZone: 'UTC'});
                const actualDate = new Date(row.date_created).toLocaleString();
                expect(actualDate).to.eql(expectedDate);

                return bcrypt.compare(newUser.password, row.password);
              })
              .then(comparMatch => {
                expect(comparMatch).to.be.true;
              })
          );
      });
    });
  });
});