import React = require("react");
import { Redirect, Link } from "react-router-dom";
import * as queryString from "query-string";

//const rootUrl = window.location.href;
const authUri = (rootUrl: string, clientId: string) =>
  `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    rootUrl
  )}&scope=user-read-private%20user-read-email&response_type=token&state=123`;

export const SpotifyAuthenticateButton = (props: {
  callbackUrl: string;
  spotifyClientId: string;
}) => {
  return (
    <a href={authUri(props.callbackUrl, props.spotifyClientId)}>
      Connect Spotify
    </a>
  );
};

export class SpotifyCallback extends React.PureComponent<
  { location: any; setToken: (token: string) => void },
  {}
> {
  render() {
    let parsed = queryString.parse(this.props.location.hash);

    if (parsed.access_token) {
      this.props.setToken(parsed.access_token as string);
      return <Redirect to="/" />;
    } else {
      return (
        <div>
          Failed to authenticate to Spotify
          <Link to="/">Home</Link>{" "}
        </div>
      );
    }
  }
}
