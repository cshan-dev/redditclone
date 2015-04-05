
var http =  require('http');
var path = require('path');
var express = require('express');
var router = express();
var server = http.createServer(router);
var flash    = require('connect-flash');
var cookieParser = require('cookie-parser');
var morgan       = require('morgan');
var session = require('express-session');
var passport = require('passport');
var util = require('util');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')


router.use(morgan('dev'));
router.use(cookieParser());
router.use(flash());
router.use(session({secret: 'keyboard cat'}));
router.use(passport.initialize());
router.use(passport.session());

//Insecure by the way
router.use( bodyParser.json() );
router.use(bodyParser.urlencoded({ extended: true }));

//router.engine('ejs', engine);
router.set('views', __dirname + '/client');

router.use(express.static(path.resolve(__dirname, 'client')));

//this will be different for every different mongo install, I was using webfaction and mongodb listens on its own port
mongoose.connect("mongodb://127.0.0.1:16372/redditdb");

//This is the mongoose/mongo version of a table declaration
var PostSchema = new mongoose.Schema({
	text: String,
	upvotes: {type: Number, default: 0},
	downvotes: {type: Number, default: 0},
	comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});
//this is the upvoting method
PostSchema.methods.upvote = function(cb) {
	this.upvotes += 1;
	this.save(cb);
};

//this is the downvoting method
PostSchema.methods.downvote = function(cb){
	this.downvotes -= 1;
	this.save(cb);
};

//this links the schema and Posts
mongoose.model('Post', PostSchema);

var CommentSchema = new mongoose.Schema({
	text: String,
	upvotes: {type: Number, default: 0},
	downvotes: {type: Number, default: 0},
	post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }
});

CommentSchema.methods.upvote = function(cb) {
	this.upvotes += 1;
	this.save(cb);
};

CommentSchema.methods.downvote = function(cb) {
	this.downvotes -=1;
	this.save(cb);
};

mongoose.model('Comment', CommentSchema);

//This declares my classes for this server/app
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');


/*
this is where I create the API part I want the following API:
GET /posts (fetch all posts, low detail)
GET /posts/:postid (fetch all of the data for one post (all comments))
POST /posts (create a new post using the posted data and return the new post data including the freshly created _id)
POST /posts/:postid/comments (create a new comment using the posted data and return the new comment including _id)
PUT /posts/:postid/upvote (upvotes the target post)
PUT /posts/:postid/comments/:commentid/upvotes (upvotes the target comment)
*/

// router.get("/", function(req, res){
// 	res.render('home', {user: req.user});
// })

router.get("/posts", function(req, res, next){
	Post.find(function(err, posts){
		if (err) { return next(err); }
		console.log("/posts Request from: " + req.user);
		res.json(posts);
	});
});

router.post('/posts', isLoggedIn, function(req, res, next) {
	var post = new Post(req.body);

	post.save(function(err, post){
		if(err){ return next(err); }

		res.json(post);
	});

});

/*
This is a slick trick I learned for this project,
when a :post variable inside of a route this function will get called
BEFORE the route.  Allows some preprocessing.
*/// router.get('/auth/google', passport.authenticate('google', { scope: [
//        'https://www.googleapis.com/auth/plus.login',
//        'https://www.googleapis.com/auth/plus.profile.emails.read']
// }));

router.param('post', function(req, res, next, id) {
	var query = Post.findById(id);

	query.exec(function (err, post){
		if (err) { return next(err); }
		if (!post) { return next(new Error('can\'t find post')); }

		req.post = post;
		return next();
	});
});


router.param('comment', function(req, res, next, id) {
	var query = Comment.findById(id);

	query.exec(function (err, comment){
		if (err) { return next(err); }
		if (!comment) { return next(new Error('can\'t find comment')); }

		req.comment = comment;
		return next();
	});
});

router.get('/posts/:post', function(req, res, next) {
	//this populate comes from mongoose, it loads up the comments associated with the post
	req.post.populate('comments', function(err, post) {
		if (err) { return next(err); }

		res.json(post);
	});
});


router.put('/posts/:post/upvote', isLoggedIn, function(req, res, next) {
	req.post.upvote(function(err, post){
		if (err) { return next(err); }

		res.json(post);
	});
});

router.put('/posts/:post/downvote', isLoggedIn, function(req, res, next){
	req.post.downvote(function(err,post){
		if(err) { return next(err);}

		res.json(post);
	});
});

router.post('/posts/:post/comments', isLoggedIn, function(req, res, next) {
	var comment = new Comment(req.body);
	comment.post = req.post;

	comment.save(function(err, comment){
		if(err){ return next(err); }

		req.post.comments.push(comment);
		req.post.save(function(err, post) {
			if(err){ return next(err); }

			res.json(comment);
		});
	});
});


//LOOK HERE LATER
router.post('/posts/:post/comments/:comment/comments', function (req,res,next){
 // var comment = new Comment(req.body);
 // comment.post = req.post;
 // comment.parents = req.comment;
 // comment.comment = req.comment;
 // comment.save(function(err, comment){
  //  if(err){return next(err);}

  // req.comment.comments.push(comment);
   req.comment.comments(function(err,comment){
   if(err){return next(err);}

    res.json(comment);

    });
   });
//});


router.put('/posts/:post/comments/:comment/upvote', isLoggedIn, function(req, res, next) {
	req.comment.upvote(function(err, comment){
		if (err) { return next(err); }


		res.json(comment);
	});
});

router.put('/posts/:post/comments/:comment/downvote', isLoggedIn, function(req, res, next){
	req.comment.downvote(function( err, comment){
		if (err) { return next(err); }


		res.json(comment);
	});
});


// ---- OUATH



//var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
//var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var GitHubStrategy = require('passport-github').Strategy;


var User = require("./user"); //user schema, mongoose setup
var configAuth = require('./auth');


// used to serialize the user for the session
passport.serializeUser(function(user, done) {
	console.log("Serializing user: " + user);
	done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		console.log("Deserializing user: " + user);
		done(err, user);
	});
});

passport.use(new GitHubStrategy({
	clientID: 		configAuth.githubAuth.clientID,
	clientSecret: configAuth.githubAuth.clientSecret,
	callbackURL: 	configAuth.githubAuth.callbackURL
},
function(accessToken, refreshToken, profile, done) {
	// asynchronous verification, for effect...
	process.nextTick(function() {

		// try to find the user based on their google id
		User.findOne({ 'github.id' : profile.id }, function(err, user) {
			if (err)
			return done(err);

			if (user) {
				console.log("Logging in: " + profile.username);
				// if a user is found, log them in
				return done(null, user);
			} else {
				// if the user isnt in our database, create a new user
				console.log("Adding to database (first time login): " + profile);
				var newUser          = new User();

				// set all of the relevant information
				newUser.github.id    = profile.id;
				newUser.github.token = accessToken;
				newUser.github.name  = profile.username;
				newUser.github.email = profile.emails[0].value; // pull the first email
				console.log("newUser added to database: " + newUser);
				// save the user
				newUser.save(function(err) {
					if (err)
					throw err;
					return done(null, newUser);
				});
			}
		});
	});
}));

router.get('/user/me', function(req, res){
	res.json(req.user);
})


// route for logging out
router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});




router.get('/auth/github',
passport.authenticate('github'),
function(req, res){
	// The request will be redirected to GitHub for authentication, so this
	// function will not be called.
});


router.get('/auth/github/callback',
passport.authenticate('github', { failureRedirect: '/login' }),
function(req, res) {
	res.redirect('/');
});


// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
	return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}


//------END OAUTH




//these ports are for my webfaction host, adjust accordingly
server.listen(32154 || 3000, "0.0.0.0", function(){
	var addr = server.address();
	console.log("Upvote server listening at", addr.address + ":" + addr.port);
});
