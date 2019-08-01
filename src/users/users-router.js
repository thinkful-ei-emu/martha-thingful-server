const express = require('express');
const path = require('path');

const usersRouter = express.Router();
const jsonParser = express.json();

const UserService = require('./users-service');

usersRouter
  .post('/', jsonParser, (req, res, next)=> {
    const { password, user_name, full_name, nickname } =req.body;

    for( const field of ['full_name', 'user_name', 'password'])
      if(!req.body[field])
        return res.status(400).json({
          error: `Missing '${field}' in request body`
        });
    
    //password validation (inside user-service)
    const passError = UserService.validatePassword(password);
    if(passError)
      return res.status(400).json({error: passError});

    UserService.hasUserWithUserName(
      req.app.get('db'),
      user_name
    )
      .then(hasUserWithUserName => {
        if(hasUserWithUserName)
          return res.status(400).json({
            error: 'Username already taken'
          });

        return UserService.hashPassword(password)
          .then(hashedPassword => {
            const newUser = {
              user_name,
              password: hashedPassword,
              full_name,
              nickname,
              date_created: 'now()'
            };
            return UserService.insertUser(
              req.app.get('db'),
              newUser
            )
              .then(user => {
                res
                  .status(201)
                  .location(path.posix.join(req.originalUrl, `/${user.id}`))
                  .json(UserService.serializeUser(user));
              });
          });
      })
      .catch(next);
  });

module.exports = usersRouter;