// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var votedPostSchema = mongoose.Schema({
  postID  : mongoose.Schema.Types.ObjectId,
  vote    : Number // -1 (down), 0 (no vote), 1 (up)
});
var userSchema = mongoose.Schema({

    github           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
        voted_posts  : [votedPostSchema]
    }

});



// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
