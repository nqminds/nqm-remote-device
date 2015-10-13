/**
 * Created by toby on 03/09/15.
 */

(function() {

  function ready() {
    var config = {
      'client_id': '1051724674890-6qk768hmaatgl2810lc4n9qbns08emqh.apps.googleusercontent.com',
      'scope': 'https://www.googleapis.com/auth/userinfo.profile'
    };

    // Authorise with google
    gapi.auth.authorize(config, function() {
      console.log('google login complete, token is: ' + gapi.auth.getToken().access_token);
      var auth = {
        provider: "google",
        token: gapi.auth.getToken().access_token
      };
      nqm.dataset(auth, "http://localhost:2222/api/datasets/4yDKOYAp", function(err,result) {
        if (err) {
          console.error(err);          
        }
        console.log("results are: " + JSON.stringify(result));
      });
      nqm.dataset(auth, "http://localhost:2222/api/datasets/E1lgiICT", function(err,result) {
        if (err) {
          console.error(err);          
        }
        console.log("results are: " + JSON.stringify(result));
      });
    });
  }

  window.onload = function() {
    ready();
  };


}());