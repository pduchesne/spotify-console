import * as ReactDOM from "react-dom";
import * as React from "react";
import * as SpotifyWebApi from "spotify-web-api-js";

/*
const rootUrl = window.location.href;
const authUri =
  "https://accounts.spotify.com/authorize?client_id=351c8186ba274223974a895974580b87&redirect_uri=" +
  encodeURIComponent(rootUrl + "#/callback/spotify") +
  "&scope=user-read-private%20user-read-email&response_type=token&state=123";

const SpotifyAuthenticateButton = () => {
  return <a href={authUri}>Connect Spotify</a>;
};
*/

const Header = () => {
  let spot = new SpotifyWebApi();

  return <h2>Spotify Console using token {spot.getAccessToken()}</h2>;
};

ReactDOM.render(<Header />, document.getElementById("index"));
