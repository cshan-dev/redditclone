//we'll use routes for this one, our app is "upvoter"
var app = angular
.module("upvoter", ['ngRoute']);

app.config([
  "$routeProvider",
  function($routeProvider){
    $routeProvider
    .when ('/', {
      templateUrl: "home.html",
      controller : "homeController",
      resolve : {
        //This resolve thing is new here, it triggers some functions before displaying the screen.
        postPromise: ["posts", function(posts){
          return posts.fetchAll();}],
          user: ["posts", function(posts){
            return posts.getMyUser();
          }]
        }
      })
      .when('/topic/:id', {
        templateUrl: "topics.html",
        controller : "topicController",
        resolve : {
          post: ["$route", "posts", function($route, posts) {
            //I had to consolt stack overflow for the "current" params bit.
            console.log($route.current.params);
            return posts.fetchOne($route.current.params.id);
          }]
        }
      })
      .otherwise({
        redirectTo : "/"
      });
    }
  ]);

  //this factory is an angular way of creating a "singleton" (look it up under design patterns)
  // we will create an object here that can be passed between controllers using the dependency injection (the square brackets everywhere)
  //the name will be "posts" and it will handle the AJAX too.
  app.factory('posts', ["$http", function($http){

    var object = {
      posts : [],
      user : {},
      //Now we call the API as it was laid out in the server file.
      getMyUser: function(){
        return $http.get("/user/me").success(function(data){
          angular.copy(data, object.user);
        })
      },

      fetchAll : function(){
        return $http.get("/posts").success(function(data){
          angular.copy(data, object.posts);
        });
      },

      fetchOne : function(id) {
        return $http.get("/posts/"+id).then(function(res){  return res.data; });
      },

      createPost : function(post) {
        return $http.post("/posts", post).success(function(data){
          object.posts.push(data);
        });
      },

      addComment : function(id, comment) {
        return $http.post("/posts/"+id+"/comments",comment);
      },
      downvote : function(post){
        return $http.put("/posts/" + post._id + "/downvote")
        .success(function(data){
          post.downvotes -= 1;
        });
      },


      downvoteComment : function(post,comment){
        return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/downvote")
        .success(function(data){
          comment.downvotes -= 1;
        });
      },

      upvote : function(post){
        return $http.put("/posts/" + post._id + "/upvote")
        .success(function(data){
          post.upvotes += 1;
        });
      },

      upvoteComment : function(post, comment) {
        return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/upvote")
        .success(function(data){
          comment.upvotes += 1;
        });
      },

      commentingComment : function(post, comment){
        return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/comments")
        .success(function(data){
          comment.comments +=1;
        });
      }
    };

    return object;

  }]);


  app.controller(
    "topicController",
    //post is the results of the resolve action when hitting a specific route, it is thus also the result of "fetchOne"
    ["$scope", "posts", "post",
    function($scope, posts, post){
      $scope.text = "";

      $scope.topic = post;
      $scope.comments = post.comments;

      $scope.addComment = function(){
        //this prevents adding an empty comment
        if (!$scope.text || $scope.text === ''){ return; }
        //calling the factory method, notice that we are saving the "success" callback to here
        //so we can inject the comments into scope
        posts.addComment(post._id, {text: $scope.text, upvotes: 0})
        .success(function(comment) {
          $scope.comments.push(comment);
        });
        //clear the input
        $scope.text = '';
      }
      //something to call onclicks
      $scope.increaseCommentUpvotes = function(comment){
        posts.upvoteComment(post, comment);
      }
      $scope.decreaseCommentDownvotes = function(comment){
        posts.downvoteComment(post,comment);
      }
    }
  ]
);

app.controller(
  "homeController",
  ["$scope", "posts",
  function($scope, posts, user){
    $scope.text = "";
    $scope.posts = posts.posts;
    $scope.user = posts.user.github;
    //very similar to above code.
    $scope.addPost = function(){
      if (!$scope.text || $scope.text === ''){ return; }
      posts.createPost({text: $scope.text, upvotes: 0, comments: []});
      $scope.text = '';
    }

    $scope.increaseUpvotes = function(post){
      posts.upvote(post);
    }
    $scope.decreaseDownvotes = function(post){
      posts.downvote(post);
    }
  }
]
);
