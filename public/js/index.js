var loggedInUserName;
var loggedInUserPhotoUrl;
var commentIdSet = [];
var timeoutCommentIdSet = [];
var userColors = new Object();
var liveUserCount = 0;
var loggedInUserId;
const databasePosts = "posts";
var listOfTimeoutees = [];
var commentSelected = null;
var timeoutButtonPrevious = null;
var userIsOnTimeout = false;
var lastActionTime = 0;
var userIsOnline = false;
var currentChatId = "main-group-chat";
var databaseRoot = firebase.database().ref();
var database = databaseRoot.child("chats").child(currentChatId);

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

function SetChat(chatId){
  currentChatId = chatId;
  database = databaseRoot.child("chats").child(currentChatId);
}

window.onload = function() {
  initApp();
  firebase.analytics();
};

function confirmExit(){
  if (loggedInUserId != null && loggedInUserId != "")
  {
    OnUserLeave();
  }
    return null;
}

function OnUserLeave(){
  if (userIsOnline)
  {
    database.child("online").child(loggedInUserId).remove();
    database.child("live-user-count").once('value', function(snapshot){
      var curCount = snapshot.val().count;
      database.child("live-user-count").update({count: curCount - 1});
    });
    userIsOnline = false;
  }
}

function SendUserStillActive(){
  var dateNew = new Date();
  var timeNow = dateNew.getTime();

  // if current action time is more than 300 seconds from last action
  // let the server know that we are still active
  if (timeNow - lastActionTime > 19000 && loggedInUserId != null && loggedInUserId != "")
  {
    OnUserEnter();
    lastActionTime = timeNow;
  }
}

function OnUserEnter(){
  // if we weren't online before, increment the count
  if (!userIsOnline)
  {

    database.child("live-user-count").once('value', function(snapshot){
      if (snapshot.child('count').exists()){
        var curCount = snapshot.val().count;
        database.child("live-user-count").update({count: curCount + 1});
      }
      else {
        database.child("live-user-count").set({count: 1});
      }
    });
  }
  var dateNew = new Date();
  var timeNow = dateNew.getTime();
  database.child("online").child(loggedInUserId).set({online: timeNow});
  userIsOnline = true;
}

function Submit(){
  var comment = document.getElementById("comment-entry").value;
  if (comment == "")
  {
    return;
  }
  var newPostKey = database.child(databasePosts).push().key;
  var submitDate = new Date();
  database.child(databasePosts).child(newPostKey).set({
    username: loggedInUserName,
    uid: loggedInUserId,
    profile_picture : loggedInUserPhotoUrl,
    comment: comment,
    day: submitDate.getUTCDay(),
    hours: submitDate.getUTCHours(),
    minutes: submitDate.getUTCMinutes()
  });
  databaseRoot.child("users").child(loggedInUserId).update({
    userLastPosted: submitDate.getTime()
  });
  document.getElementById("comment-entry").value = "";
  document.getElementById("comment-entry").focus();
}

function SubmitTimeout(){
  var comment = document.getElementById("timeout-comment-entry").value;
  if (comment == "")
  {
    return;
  }
  var newPostKey = database.child("timeout-posts").push().key;
  var submitDate = new Date();
  database.child("timeout-posts").child(newPostKey).set({
    username: loggedInUserName,
    uid: loggedInUserId,
    profile_picture : loggedInUserPhotoUrl,
    comment: comment,
    day: submitDate.getUTCDay(),
    hours: submitDate.getUTCHours(),
    minutes: submitDate.getUTCMinutes()
  });
  databaseRoot.child("users").child(loggedInUserId).update({
    userLastPosted: submitDate.getTime()
  });
  document.getElementById("timeout-comment-entry").value = "";
  document.getElementById("timeout-comment-entry").focus();
}

function submitOnEnter(event){
    if(event.which === 13 && !event.shiftKey){
        Submit();
        event.preventDefault(); // Prevents the addition of a new line in the text field (not needed in a lot of cases)
    }
}

function submitOnEnterTimeout(event){
    if(event.which === 13 && !event.shiftKey){
        SubmitTimeout();
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

function LoadRoom (roomId) {
  console.log("loading room... " + roomId);
  SetChat(roomId);
  database.once('value', function(snapshot){
    snapVal = snapshot.val();
    if (snapshot.child('backgroundImageUrl').exists())
    {
      var backgroundImageUrl = snapVal.backgroundImageUrl;
      console.log("has a specified background image! " + backgroundImageUrl);
      document.body.style["background-image"] = "url(" + backgroundImageUrl + ")";
    }
    else
    {
      console.log("no specified background image! using default");
    }

    if (snapshot.child('welcomeMessage').exists()){
      var welcomeMessage = snapVal.welcomeMessage;
      document.getElementById("welcome-message").textContent = welcomeMessage;
    }
    else {
      if (snapshot.child('chatName').exists()){
        document.getElementById("welcome-message").textContent = snapVal.chatName;
      }
    }

    if (snapshot.child('subtitle').exists()){
      document.getElementById("subtitle").textContent = snapVal.subtitle;
    }
    else {
      document.getElementById("subtitle").textContent = "chat responsibly";
    }

    document.getElementById("invite-link").textContent = "   Invite your friends! Send them onebiggroupchat.com/?room=" + currentChatId;
    var elements = document.querySelectorAll('.windows-xp-window');
    for(var i=0; i<elements.length; i++){
      elements[i].style["background-image"] = "none";
      elements[i].style["background-color"] = "white";
    }
  });
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
      var url = window.location;
      if (url.href.includes("?room"))
      {
        var params = new URLSearchParams(url.search);
        console.log(url.search);

        var roomId = params.get("room");
        console.log("room! " + roomId);
        LoadRoom(roomId);
      }
      else {
        var roomId = "main-group-chat";
        console.log("no room! main: " + roomId);
      }

        database.child("live-user-count").once('value').then(function(snapshot){
          if (snapshot.child('count').exists()){
            liveUserCount = snapshot.val().count;
          }
          else {
            liveUserCount = 0;
          }
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
          window.onbeforeunload = confirmExit;
          window.onmousemove = SendUserStillActive;
          window.onkeypress = SendUserStillActive;
          window.onclick = SendUserStillActive;
          // User is signed in.
          var displayName = user.displayName;
          var photoURL = user.photoURL;
          var isAnonymous = user.isAnonymous;
          var uid = user.uid;
          var providerData = user.providerData;
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
          document.getElementById("timeout-comment-entry").addEventListener("keypress", submitOnEnterTimeout);
          UpdateListOfTimeoutees();

          window.setInterval(function(){
            var dateNew = new Date();
            // if current action time is more than 300 seconds from last action
            // boot ourselves from active
            if (dateNew.getTime() - lastActionTime > 290000 && loggedInUserId != null && loggedInUserId != "")
            {
              OnUserLeave();
            }
          }, 300000);

          OnUserEnter();

          // as the value changes, keep the text updated
          database.child("online").on('value', function(snapshot){
            liveUserCount = snapshot.numChildren();
            document.getElementById("live-user-count").textContent = liveUserCount - 1;
          });

          var timeouteesRef = database.child("timeoutees");
          timeouteesRef.on('child_added', function(snapshot){
            var dateRightNowCheck = new Date();
            var userName = snapshot.val().username;
            var keyToDelete = snapshot.key;
            var userId = snapshot.val().uid;

            if (userId == loggedInUserId)
            {
              // i'm on timeout
              userIsOnTimeout = true;
              console.log("Sorry friendo, you are on TIMEOUT");
            }

            // check if timeout is over
            if (snapshot.val().timeoutBegin < dateRightNowCheck.getTime() - snapshot.val().timeoutLength)
            {
              console.log("timeout is over now for: " + userName);
              database.child("timeoutees").child(keyToDelete).remove();
              databaseRoot.child("users").child(userId).update({inTimeout: false});
              listOfTimeoutees.splice(listOfTimeoutees.indexOf(userName), 1);
              userIsOnTimeout = false;
            }
            else {
              // get the remaining time and remove when over
              var timeoutLengthRemaining = (snapshot.val().timeoutBegin + snapshot.val().timeoutLength) - dateRightNowCheck.getTime();
              console.log("timeout will be over for: " + userName + " in " + timeoutLengthRemaining + " ms");
              if (!listOfTimeoutees.includes(userName))
              {
                listOfTimeoutees.push(userName);
              }

              setTimeout(function(){
                database.child("timeoutees").child(keyToDelete).remove();
                databaseRoot.child("users").child(userId).update({inTimeout: false});
                listOfTimeoutees.splice(listOfTimeoutees.indexOf(userName), 1);
                userIsOnTimeout = false;
                UpdateListOfTimeoutees();
              }, timeoutLengthRemaining);
            }


            UpdateListOfTimeoutees();
          });

          var postsRef = database.child(databasePosts);
          postsRef.on('child_added', function(snapshot) {
            // check if there more than 15 comments
            if (commentIdSet.length > 14)
            {
              // remove from db
              postsRef.child(commentIdSet[0]).remove();

              // remove local display
              var commentList = document.getElementById("comment-list");
              commentList.removeChild(commentList.childNodes[0]);

              // remove local id from set
              commentIdSet.splice(0, 1);
            }
            var key = snapshot.key;
              // childData will be the actual contents of the child
              var childData = snapshot.val();
              if (!commentIdSet.includes(key))
              {
                var userId = childData.uid;
                var userName = childData.username;
                var comment = childData.comment;
                if (userId == null || userId == "")
                {
                  userId = userName;
                }

                var commentList = document.getElementById("comment-list");
                var commentContainer = document.createElement("div");
                commentContainer.className += "comment-container";
                var listItem = document.createElement("div");
                var userInfoModal = document.createElement("div");
                listItem.style["width"] = "90%";
                var nameItem = document.createElement("span");
                var commentItem = document.createElement("span");
                var timestampItem = document.createElement("span");
                var timeoutButton = document.createElement("button");
                timeoutButton.className += "timeout-button";
                timeoutButton.textContent = "Timeout!";

                // var addToChatButton = document.createElement("button");
                // addToChatButton.textContent = "Invite to chat";
                // userInfoModal.appendChild(addToChatButton);
                userInfoModal.appendChild(timeoutButton);
                userInfoModal.className += "user-info-modal";

                // var chatList = document.createElement("div");
                // chatList.style['display'] = "none";
                // chatList.style['padding'] = "10px";
                // var newPrivateChatButton = document.createElement("button");
                // newPrivateChatButton.textContent = "Request direct message";
                // newPrivateChatButton.addEventListener("click", function(event){
                //   OnPrivateMessageClick(userId, userName);
                // });
                //
                // chatList.appendChild(newPrivateChatButton);
                // databaseRoot.child("users").child(loggedInUserId).child("chats-inside").on('child_added', function(snapshot){
                //   var chatDetails = snapshot.val();
                //   if (chatDetails.invitePermission)
                //   {
                //     var br = document.createElement("br");
                //     var chatButton = document.createElement("button");
                //     chatButton.textContent = chatDetails.chatName;
                //     chatList.appendChild(br);
                //     chatList.appendChild(chatButton);
                //   }
                // });
                //
                // userInfoModal.appendChild(chatList);

                timeoutButton.addEventListener("click", function(event){
                  OnTimeoutClick(userId, userName, comment);
                  event.preventDefault();
                }, false );

                // addToChatButton.addEventListener("click", function(event){
                //   chatList.style["display"] = "block";
                //   event.preventDefault();
                // }, false );

                // to check for mobile users clicking on a comment
                nameItem.addEventListener("click", function(event){
                  if (commentSelected == listItem)
                  {
                    // clicked the same one again, probaly hitting timeout!
                    event.stopPropagation();
                  }
                  else {
                    // this is a new one, leave the old one
                    OnNameMouseLeave(userId, timeoutButtonPrevious, commentSelected);
                  }

                  OnNameMouseOver(userId, userInfoModal, listItem);
                  event.preventDefault();
                }, false);

                nameItem.addEventListener("mouseover", function(event){
                  if (commentSelected == listItem)
                  {
                    // clicked the same one again, probaly hitting timeout!
                    event.stopPropagation();
                  }
                  else {
                    // this is a new one, leave the old one
                    OnNameMouseLeave(userId, timeoutButtonPrevious, commentSelected);
                  }

                  OnNameMouseOver(userId, userInfoModal, listItem);
                  event.preventDefault();
                }, false);

                userInfoModal.addEventListener("mouseleave", function(event){
                  OnNameMouseLeave(userId, userInfoModal, listItem);
                  event.preventDefault();
                }, false);

                timestampItem.className += "timestamp-display";
                listItem.appendChild(nameItem);
                listItem.appendChild(commentItem);
                listItem.appendChild(timestampItem);
                listItem.appendChild(userInfoModal);

                if (childData.day != null)
                {
                  timestampItem.textContent = GetTimestampString(childData.day, childData.hours, childData.minutes);
                }

                commentContainer.appendChild(listItem);

                if (userColors[childData.uid] == null)
                {
                  userColors[childData.uid] = colors[childData.uid.hashCode() % colors.length];
                }
                listItem.style["position"] = "relative";
                listItem.style["left"] = "2%";
                nameItem.textContent = userName + ": ";
                nameItem.style["color"] = userColors[userId];
                var toDisplay = "";
                if (userIsOnTimeout)
                {
                  for (var i = 0; i < comment.length; i++)
                  {
                    if (comment[i] != " ")
                      toDisplay += "*";
                    else {
                      toDisplay += " ";
                    }
                  }
                }
                else {
                  toDisplay = comment;
                }
                commentItem.textContent = toDisplay;
                commentList.appendChild(commentContainer);
                commentIdSet.push(key);
              }
          });

          var timeoutPostsRef = database.child("timeout-posts");
          timeoutPostsRef.on('child_added', function(snapshot) {
            if (timeoutCommentIdSet.length > 3)
            {
              // remove from db
              timeoutPostsRef.child(timeoutCommentIdSet[0]).remove();

              // remove local display
              var timeoutCommentList = document.getElementById("timeout-comment-list");
              timeoutCommentList.removeChild(timeoutCommentList.childNodes[0]);

              // remove local id from set
              timeoutCommentIdSet.splice(0, 1);
            }
                var key = snapshot.key;

                  // childData will be the actual contents of the child
                  var childData = snapshot.val();
                  if (!timeoutCommentIdSet.includes(key))
                  {
                    var userId = childData.uid;
                    var userName = childData.username;
                    var comment = childData.comment;
                    if (userId == null || userId == "")
                    {
                      userId = userName;
                    }

                    var commentList = document.getElementById("timeout-comment-list");
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

                    if (childData.day != null)
                    {
                      timestampItem.textContent = GetTimestampString(childData.day, childData.hours, childData.minutes);
                    }

                    commentContainer.appendChild(listItem);

                    if (userColors[childData.uid] == null)
                    {
                      userColors[childData.uid] = colors[childData.uid.hashCode() % colors.length];
                    }
                    listItem.style["position"] = "relative";
                    listItem.style["left"] = "2%";
                    nameItem.textContent = userName + " (ON TIMEOUT): ";
                    nameItem.style["color"] = userColors[userId];
                    var toDisplay = comment;
                    commentItem.textContent = toDisplay;
                    commentList.appendChild(commentContainer);
                    timeoutCommentIdSet.push(key);
                  }
          });

          var nominatedTimeouteesRef = database.child("nominated-timeoutees");
          nominatedTimeouteesRef.on('child_added', function(snapshot) {
            var nomineeData = snapshot.val();
            if (nomineeData.uid == loggedInUserId)
            {
              var stringVal = nomineeData.nominator + " has requested that you be put in timeout. \n The comment in question that " + nomineeData.username + " said was: \"" + nomineeData.comment + "\".";
              window.alert(stringVal);
              // check to see if someone nominated themselves
              if (nomineeData.nominatorId != loggedInUserId)
              {
                  return;
              }
            }
            if (nomineeData.nominatorId == loggedInUserId)
            {
              if (nomineeData.votes >= nomineeData.votesNeeded)
              {
                console.log("ENOUGH VOTES: PUTTING " + nomineeData.username + " IN TIMEOUT!");
                PutInTimeout(nomineeData.uid, nomineeData.username, nomineeData.comment);
                nominatedTimeouteesRef.child(snapshot.key).remove();
              }
              return;
            }
            var stringVal = nomineeData.nominator + " has requested that " + nomineeData.username + " be put in timeout. \n The comment in question that " + nomineeData.username + " said was: \"" + nomineeData.comment + "\"." + "\n Click OK to vote to put them in timeout, click CANCEL to vote NOT to put them in timeout.";
            var confirm = window.confirm(stringVal);
            if (confirm){
              var currentVotes;
              nominatedTimeouteesRef.child(snapshot.key).once('value', function(snapshotVotes){
                currentVotes = snapshotVotes.val().votes;
                nominatedTimeouteesRef.child(snapshot.key).update({
                  votes: currentVotes + 1
                }, function(error){
                  if(error)
                  {
                    console.log("error updating votes");
                  }
                  else {
                    if (nomineeData.votes + 1 >= nomineeData.votesNeeded)
                    {
                      console.log("ENOUGH VOTES: PUTTING " + nomineeData.username + " IN TIMEOUT!");
                      PutInTimeout(nomineeData.uid, nomineeData.username, nomineeData.comment);
                      nominatedTimeouteesRef.child(snapshot.key).remove();
                    }
                  }
                });
              });
            }
            else {

            }
          });

          // nominatedTimeouteesRef.on('child_changed', function(snapshot) {
          //
          // });

        } else {
          // User is signed out.
          // [START_EXCLUDE]
          console.log("LOGGED OUT USER! ");

          document.getElementById('quickstart-sign-in').textContent = 'Log in with Facebook';
          document.getElementById('display-name').textContent = "Please log in so people know your name.";
          document.getElementById('comment-entry').disabled = true;
          document.getElementById('submit-button').disabled = true;
          document.getElementById('private-content').style['visibility'] = "hidden";

          // if the user is logging out, take them offline
          if (loggedInUserId != null & loggedInUserId != "")
          {
            OnUserLeave();
            loggedInUserId = null;
          }

          // [END_EXCLUDE]
        }
        // [START_EXCLUDE]
        document.getElementById('quickstart-sign-in').disabled = false;
        // [END_EXCLUDE]
      });
      // [END authstatelistener]

      document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
    }

    function OnTimeoutClick(userId, userName, comment){
      if (userIsOnTimeout)
      {
        alert("Sorry, you're in timeout. You can't put other people in timeout.");
      }
      else {
        var confirm = window.confirm("Are you sure you would like to put " + userName + " on trial for timeout for saying \"" + comment + "\"? \n The rest of the chat will have 60 seconds to vote. \n It requires a 1/3rd approval.");
        if (confirm) {
          console.log(userName + " is now on trial for timeout for saying " + comment);
          NominateToTimeout(userId, userName, comment);
        }
      }
    }

    function OnPrivateMessageClick(userId, userName){
      var requestKey = databaseRoot.child("users").child(userId).child("message-requests").push().key;
      databaseRoot.child("users").child(userId).child("message-requests").child(requestKey).set({
        requesterName: loggedInUserName,
        requesterId: loggedInUserId
      });
    }

    function OnAddToChatClick(userId, userName) {

    }

    function OnNameMouseOver(userId, modalToShow, listItem)
    {
      commentSelected = listItem;
      timeoutButtonPrevious = modalToShow;
      modalToShow.style['visibility'] = "visible";
      listItem.style['background-color'] = '#DDD';
    }

    function OnNameMouseLeave(userId, modalToHide, listItem){
      commentSelected = null;
      timeoutButtonPrevious = null;
      if (listItem != null)
        listItem.style['background-color'] = "";
      if (modalToHide != null)
        modalToHide.style['visibility'] = "hidden";
    }

    function NominateToTimeout(userId, userName, comment)
    {
      console.log("Votes needed: " + Math.floor(liveUserCount + 2 / 3));
      database.child("nominated-timeoutees").child(userId).update({
        username: userName,
        uid: userId,
        comment: comment,
        nominator: loggedInUserName,
        nominatorId: loggedInUserId,
        votes: 1,
        votesNeeded: Math.floor(liveUserCount + 2 / 3)
      });

      // after 60 seconds, the vote is called
      setTimeout(function(){
        database.child("nominated-timeoutees").child(userId).remove();
      }, 60000);
    }

    function PutInTimeout(userId, userName, comment){
      var newPostKey = database.child("timeoutees").push().key;
      var submitDate = new Date();

      databaseRoot.child("users").child(userId).once('value').then(function(snapshot){
        var timeoutCount = (snapshot.val() && snapshot.val().timeoutCount) || 1;
        var timeoutLength = 60000 * timeoutCount;
        database.child("timeoutees").child(userId).update({
          username: userName,
          uid: userId,
          comment: comment,
          timeoutBegin: submitDate.getTime(),
          timeoutLength: timeoutLength
        });
        timeoutCount++;
        databaseRoot.child("users").child(userId).update({
          inTimeout: true,
          timeoutCount: timeoutCount
        });
      });

    }

    function ToggleTimeout(){
      if (document.getElementById("timeout-box").style["visibility"] == "visible")
      {
        document.getElementById("timeout-box").style["visibility"] = "hidden";
        document.getElementById("toggle-timeout-button").textContent = "Show the Timeout chat";
      }
      else if (document.getElementById("timeout-box").style["visibility"] == "hidden")
      {
        document.getElementById("timeout-box").style["visibility"] = "visible";
        document.getElementById("toggle-timeout-button").textContent = "Hide the Timeout chat";
      }
    }

    function UpdateListOfTimeoutees(){
      // now update list of people in timeout
      var listOfTimeouteesElement = document.getElementById("list-of-timeoutees");
      listOfTimeouteesElement.textContent = "";
      listOfTimeoutees.forEach(function(item){
        if (listOfTimeouteesElement.textContent == "")
        {
          listOfTimeouteesElement.textContent += item;
        }
        else {
          listOfTimeouteesElement.textContent += ", " + item;
        }
      });

      var timeoutElement = document.getElementById("timeout");
      if (listOfTimeouteesElement.textContent == "")
      {
        // no one is in timeout
        timeoutElement.style["display"] = "none";
      }
      else {
        timeoutElement.style["display"] = "";
        if (userIsOnTimeout)
        {
          document.getElementById('timeout-comment-entry').disabled = false;
          document.getElementById('timeout-submit-button').disabled = false;
          document.getElementById('timeout-comment-entry').style["visibility"] = "visible";
          document.getElementById('timeout-submit-button').style["visibility"] = "visible";
        }
        else {
          document.getElementById('timeout-comment-entry').disabled = true;
          document.getElementById('timeout-submit-button').disabled = true;
          document.getElementById('timeout-comment-entry').style["visibility"] = "hidden";
          document.getElementById('timeout-submit-button').style["visibility"] = "hidden";
        }
      }
      if (userIsOnTimeout)
      {
        document.getElementById('comment-entry').disabled = true;
        document.getElementById('submit-button').disabled = true;
        document.getElementById('timeout-status').style["display"] = "";
        document.getElementById('timeout-status').textContent = "Looks like you're in timeout. You cannot read the chat, but everyone in the chat can read what you type into the Timeout apology box below.";
      }
      else {
        document.getElementById('timeout-status').textContent = "";
        document.getElementById('timeout-status').style["display"] = "none";
        document.getElementById('comment-entry').disabled = false;
        document.getElementById('submit-button').disabled = false;
      }
    }

    function GetTimestampString(day, hour, minutes){
      var timestampString = "";

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
        localHour = "12";
        ampm = "am";
      }
      var localMin = timezoneMin % 60;
      if (localMin < 10)
      {
        localMin = "0" + localMin;
      }
      timestampString = localHour + ":" + localMin + ampm;
      return timestampString;
    }
