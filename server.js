
var http =  require('http');
var path = require('path');
var express = require('express');
var router = express();
var server = http.createServer(router);

//mongoose is the node/mongodb connection layer
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
//Insecure by the way
router.use( bodyParser.json() );

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
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
 // parents: {{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}
// comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
  comments:{type:Number, default: 0}
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

router.get("/posts", function(req, res, next){
  Post.find(function(err, posts){
    if (err) { return next(err); }
    res.json(posts);
  });
});

router.post('/posts', function(req, res, next) {
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
*/

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


router.put('/posts/:post/upvote', function(req, res, next) {
  req.post.upvote(function(err, post){
    if (err) { return next(err); }

    res.json(post);
  });
});

router.put('/posts/:post/downvote', function(req, res, next){
  req.post.downvote(function(err,post){
    if(err) { return next(err);}

     res.json(post);
   });
});

router.post('/posts/:post/comments', function(req, res, next) {
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

router.put('/posts/:post/comments/:comment/upvote', function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err); }

   
 res.json(comment);
  });
});

router.put('/posts/:post/comments/:comment/downvote', function(req, res, next){
  req.comment.downvote(function( err, comment){
    if (err) { return next(err); }


  res.json(comment);
   });
});


//these ports are for my webfaction host, adjust accordingly
server.listen(32154 || 3000, "0.0.0.0", function(){
  var addr = server.address();
  console.log("Upvote server listening at", addr.address + ":" + addr.port);
});
