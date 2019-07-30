const AuthService = { 
  getUserWithUserName(db, user_name){
    return db('thingful_users')
      .where({user_name})
      .first();
  },
  parseBasicToken(token){
    return Buffer
      .from(token, 'base64')
      .toString()
      .split(':');
  }
};

module.exports = AuthService;