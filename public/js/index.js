var database = firebase.database();
var loggedInUserName;
var loggedInUserPhotoUrl;
var commentIdSet = new Set();
var userColors = new Object();
var liveUserCount = 0;
var loggedInUserId;
const databasePosts = "posts";

var colors = [
  "#3B77BC",
  "#DE482B",
  "#81C046",
  "#B7CFE9",
  "#729AC9",
  "#F4B626",
  "#CB161B",
  "#56BFCB",
  "#023D97",
  "#F66B02",
  "#FFAD01",
  "#A54515",
  "#990199",
  "#E60995",
  "#4E197F",
  "#2A63B3",
  "#4FB35D",
  "#CC3A38",
  "#176FC1",
  "#59C247",
  "#e88635",
  "#9e0500"
];

String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
  if (hash < 0){
    hash *= -1;
  }
	return hash;
}

function Submit(){
  var comment = document.getElementById("comment-entry").value;
  if (comment == "")
  {
    return;
  }
  var newPostKey = firebase.database().ref(databasePosts).push().key;
  var submitDate = new Date();
  firebase.database().ref(databasePosts).child(newPostKey).set({
    username: loggedInUserName,
    uid: loggedInUserId,
    profile_picture : loggedInUserPhotoUrl,
    comment: comment,
    day: submitDate.getUTCDay(),
    hours: submitDate.getUTCHours(),
    minutes: submitDate.getUTCMinutes()
  });
  document.getElementById("comment-entry").value = "";
  document.getElementById("comment-entry").focus();
}

function submitOnEnter(event){
    if(event.which === 13 && !event.shiftKey){
        Submit();
        event.preventDefault(); // Prevents the addition of a new line in the text field (not needed in a lot of cases)
    }
}

function getRandomColor() {
  var letters = '3456789AB';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

    /**
     * Function called when clicking the Login/Logout button.
     */
    // [START buttoncallback]
    function toggleSignIn() {
      if (!firebase.auth().currentUser) {
        // [START createprovider]
        var provider = new firebase.auth.FacebookAuthProvider();
        // [END createprovider]
        // [START signin]
        firebase.auth().signInWithRedirect(provider);
        // [END signin]
      } else {
        // [START signout]
        firebase.auth().signOut();
        // [END signout]
      }
      // [START_EXCLUDE]
      document.getElementById('quickstart-sign-in').disabled = true;
      // [END_EXCLUDE]
    }
    // [END buttoncallback]

    /**
     * initApp handles setting up UI event listeners and registering Firebase auth listeners:
     *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
     *    out, and that is where we update the UI.
     *  - firebase.auth().getRedirectResult(): This promise completes when the user gets back from
     *    the auth redirect flow. It is where you can get the OAuth access token from the IDP.
     */
    function initApp() {
      var onlineRef = firebase.database().ref("online");
      onlineRef.on('value', function(snapshot){
        var count = 0;
        snapshot.forEach(function(childSnapshot) {
          // if they havent been on in the last 20 seconds, boot them
          count++;
        });
        liveUserCount = count;
        document.getElementById("live-user-count").textContent = liveUserCount;
      });
      // Result from Redirect auth flow.
      // [START getidptoken]
      firebase.auth().getRedirectResult().then(function(result) {
        if (result.credential) {
          // This gives you a Facebook Access Token. You can use it to access the Facebook API.
          var token = result.credential.accessToken;
          // [START_EXCLUDE]
          //document.getElementById('quickstart-oauthtoken').textContent = token;
        } else {
          //document.getElementById('quickstart-oauthtoken').textContent = 'null';
          // [END_EXCLUDE]
        }
        // The signed-in user info.
        var user = result.user;
      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // [START_EXCLUDE]
        if (errorCode === 'auth/account-exists-with-different-credential') {
          alert('You have already signed up with a different auth provider for that email.');
          // If you are using multiple auth providers on your app you should handle linking
          // the user's accounts here.
        } else {
          console.error(error);
        }
        // [END_EXCLUDE]
      });
      // [END getidptoken]

      // Listening for auth state changes.
      // [START authstatelistener]
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // User is signed in.
          var displayName = user.displayName;
          var photoURL = user.photoURL;
          var isAnonymous = user.isAnonymous;
          var uid = user.uid;
          var providerData = user.providerData;
          console.log("LOGGED IN USER! ");
          loggedInUserName = displayName;
          loggedInUserPhotoUrl = photoURL;
          loggedInUserId = uid;
          // [START_EXCLUDE]
          document.getElementById('quickstart-sign-in').textContent = 'Log out';
          document.getElementById('display-name').textContent = "Welcome, " + displayName;
          document.getElementById('comment-entry').disabled = false;
          document.getElementById('submit-button').disabled = false;
          document.getElementById('private-content').style['visibility'] = "visible";

          document.getElementById("comment-entry").addEventListener("keypress", submitOnEnter);

          var date = new Date();
          firebase.database().ref("online").child(uid).set({online: date.getTime()});

          // every 20 seconds, ping the server
          setInterval(function(){
            var dateNew = new Date();
            firebase.database().ref("online").child(uid).update({online: dateNew.getTime()});
          }, 20000);

          var onlineRef = firebase.database().ref("online");
          onlineRef.on('value', function(snapshot){
            var dateRightNowCheck = new Date();
            var count = 0;
            snapshot.forEach(function(childSnapshot) {
              // if they havent been on in the last 20 seconds, boot them
              if (childSnapshot.val().online < dateRightNowCheck.getTime() - 20000)
              {
                firebase.database().ref("online").child(childSnapshot.key).remove();
              }
              else {
                count++;
              }
            });
            liveUserCount = count;
            document.getElementById("live-user-count").textContent = liveUserCount;
          });
          var postsRef = firebase.database().ref(databasePosts);
          postsRef.on('value', function(snapshot) {
            var deleteFirst = false;
            if (snapshot.numChildren() > 15)
            {
                deleteFirst = true;
            }
            snapshot.forEach(function(childSnapshot) {
                // key will be "ada" the first time and "alan" the second time
                var key = childSnapshot.key;

                if (deleteFirst)
                {
                  firebase.database().ref(databasePosts).child(key).remove();
                  var commentList = document.getElementById("comment-list");
                  commentList.removeChild(commentList.childNodes[0]);
                  deleteFirst = false;
                }
                else
                {
                  // childData will be the actual contents of the child
                  var childData = childSnapshot.val();
                  if (!commentIdSet.has(key))
                  {
                    var commentList = document.getElementById("comment-list");
                    var commentContainer = document.createElement("div");
                    commentContainer.className += "comment-container";
                    var listItem = document.createElement("div");
                    listItem.style["width"] = "90%";
                    var nameItem = document.createElement("span");
                    var commentItem = document.createElement("span");
                    var timestampItem = document.createElement("span");
                    timestampItem.className += "timestamp-display";
                    listItem.appendChild(nameItem);
                    listItem.appendChild(commentItem);
                    listItem.appendChild(timestampItem);
                    var timestampString = "";
                    if (childData.day != null)
                    {
                      var day = childData.day;
                      var hour = childData.hours;
                      var minutes = childData.minutes;

                      var totalMinutes = (hour * 60) + minutes;
                      var d = new Date();
                      var timezoneDiff = d.getTimezoneOffset();
                      var timezoneMin = (totalMinutes - timezoneDiff);
                      if (timezoneMin < 0) timezoneMin += 24 * 60; // if below zero, add 24 hours.
                      timezoneMin = timezoneMin % (24 * 60);

                      var localHour = Math.floor(timezoneMin / 60);
                      var ampm = "am";
                      if (localHour > 12)
                      {
                        localHour = localHour % 12;
                        ampm = "pm";
                      }
                      else if (localHour == 12)
                      {
                        ampm = "pm";
                      }
                      else if (localHour == 0)
                      {
                        ampm = "am";
                      }
                      var localMin = timezoneMin % 60;
                      if (localMin < 10)
                      {
                        localMin = "0" + localMin;
                      }
                      timestampString = localHour + ":" + localMin + ampm;
                      timestampItem.textContent = timestampString;
                    }

                    commentContainer.appendChild(listItem);
                    // if (childData.username == loggedInUserName)
                    // {
                    //   console.log("this user typed a comment");
                    //   commentContainer.style["text-align"] = "right";
                    //   listItem.style["text-align"] = "right";
                    //   listItem.style["position"] = "relative";
                    //   listItem.style["right"] = "-27%";
                    //   listItem.textContent = childData.comment;
                    // }
                    // else {
                    if (childData.uid == null || childData.uid == "")
                    {
                      childData.uid = childData.username;
                    }
                      if (userColors[childData.uid] == null)
                      {
                        userColors[childData.uid] = colors[childData.uid.hashCode() % colors.length];
                      }
                      listItem.style["position"] = "relative";
                      listItem.style["left"] = "2%";
                      nameItem.textContent = childData.username + ": ";
                      commentItem.textContent = childData.comment;
                      nameItem.style["color"] = userColors[childData.uid];
                    //}
                    commentList.appendChild(commentContainer);
                  }
                  commentIdSet.add(key);
                }
            });
          });
          // [END_EXCLUDE]
        } else {
          // User is signed out.
          // [START_EXCLUDE]
          console.log("LOGGED OUT USER! ");

          document.getElementById('quickstart-sign-in').textContent = 'Log in with Facebook';
          document.getElementById('display-name').textContent = "Please log in so people know your name.";
          document.getElementById('comment-entry').disabled = true;
          document.getElementById('submit-button').disabled = true;
          document.getElementById('private-content').style['visibility'] = "hidden";

          // [END_EXCLUDE]
        }
        // [START_EXCLUDE]
        document.getElementById('quickstart-sign-in').disabled = false;
        // [END_EXCLUDE]
      });
      // [END authstatelistener]

      document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
    }

    window.onload = function() {
      initApp();
    };
