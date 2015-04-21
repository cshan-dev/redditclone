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
        templateUrl: "topic.html",
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
      upvoteComment : function(post, comment) {
        return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/upvote")
        .success(function(data){
          comment.upvotes += 1;
        });
      },
      commentingComment : function(post, comment){
        return $http.put("/posts/"+post._id + "/comments/"+comment._id + "/comments", comment)
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
      //TODO iterate over comments and create tree view
      //make comment map for constant time finds
      var commentMap = new Map();
      for (comment of $scope.comments){
        commentMap.set(comment._id, comment);
        console.log("Comment in map: " + comment);
      }
      console.log("commentMap: " + JSON.stringify(commentMap));
      $scope.comments = makeCommentTree2($scope.comments, commentMap, []);
      console.log($scope.comments);

      $scope.addComment = function(parentComment){
        //this prevents adding an empty comment
        if (!$scope.text || $scope.text === ''){ return; }
        //calling the factory method, notice that we are saving the "success" callback to here
        //so we can inject the comments into scope
        var newComment = {text: $scope.text,
          upvotes: 0,
          downvotes: 0};
        if (parentComment != null) {
          console.log("parentComment: " + JSON.stringify(parentComment));
          newComment.parentComment = parentComment;
          console.log("Adding child comment, parent: " + newComment.parent);
        }
          posts.addComment(post._id, newComment)
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

          //  prompt("Enter Comment","");
        }
        $scope.increaseCommentComments = function(comment){
          // comments.commentComment(comment);
          prompt("Enter Comment","");
          //  var post = comment.nodes.length +1;
          // var newcomment = newComment +'-'+post;

        }
      }
    ]
  );

  app.controller(
    "homeController",
    ["$scope", "posts",
    function($scope, posts){

      $scope.modalShown = false;
      $scope.toggleModal = function() {
        $scope.show = !$scope.show;
      };
      $scope.text = "";
      $scope.posts = posts.posts;
      $scope.user = posts.user.github;
      //very similar to above code.
      $scope.addPost = function(){
        if (!$scope.text || $scope.text === ''){ return; }
        posts.createPost({text: $scope.text, upvotes: 0, downvotes: 0, comments: []});
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
//directive to be used on class="login-required"
app.directive('loginRequired', function(){
  return {
    restrict: 'C',
    templateUrl: "login-popup.html",
    transclude: true,
    link: function(scope, elem, attrs){
      if (! scope.user) {
        elem.on("click", function(){
          console.log("scope.show before set" + scope.show);
          scope.show = !scope.show;
          console.log("Clicked loginRequired" + scope.show);
        });
      }
    }
  };
})

function makeCommentTree(commentsList, commentMap){
  for (var comment of commentsList){
    if (comment.comments){
      console.log("Processing children " + comment);
    //if a comment has children, inject them into its JSON and remove from list
      // for (var child of comment.comments){
      //   console.log("child: " + child);
      //   child = commentMap.get(child);
      //   console.log("childmapped: " + child);
      //   child.comments = makeCommentTree(child.comments);
      // }
      for (var i = 0; i < comment.comments.length; i++){
        console.log("child: " + comment.comments[i]);
        comment.comments[i] = commentMap.get(comment.comments[i]);
        // commentsList.splice(i, 1)
        console.log("childmapped: " + comment.comments[i]);
      }
    }
  }
  return commentsList;
}

function makeCommentTree2(commentsList, commentMap, commentTree){
  for (var i = 0; i < commentsList.length; i++){
    console.log("Processing comment " + i + ", " + commentsList[i]);
    if (!commentsList[i].discovered){
      commentTree.push(commentsList[i]);
    }
    if (commentsList[i].comments){
      console.log("commentsList[" + i + "] has "
                  + commentsList[i].comments.length + "children");
      for (var j = 0; j < commentsList[i].comments.length; j++){
        console.log("Looking at child: " + j + ", " + commentsList[i].comments[j]);
        var child = commentMap.get(commentsList[i].comments[j]);
        child.discovered = true;
        commentsList[i].comments[j] = child;
        commentTree = makeCommentTree2(child.comments, commentMap, commentTree);
      }
    }
  }
  return commentTree;
}
