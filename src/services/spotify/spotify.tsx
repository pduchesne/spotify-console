import React = require('react');
import { Redirect, Link } from 'react-router-dom';
import * as queryString from 'query-string';
import { UserConnection } from '../..';
import * as SpotifyWebApi from 'spotify-web-api-js';

//const rootUrl = window.location.href;
const authUri = (rootUrl: string, clientId: string) =>
    `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        rootUrl
    )}&scope=user-read-private%20user-read-email%20user-read-playback-state&response_type=token&state=123`;

export const SpotifyAuthenticateButton = (props: { callbackUrl: string; spotifyClientId: string }) => {
    return <a href={authUri(props.callbackUrl, props.spotifyClientId)}>Connect Spotify</a>;
};

export class SpotifyCallback extends React.PureComponent<{ location: any; setToken: (token: string) => void }, {}> {
    render() {
        let parsed = queryString.parse(this.props.location.hash);

        if (parsed.access_token) {
            this.props.setToken(parsed.access_token as string);
            return <Redirect to="/" />;
        } else {
            return (
                <div>
                    Failed to authenticate to Spotify
                    <Link to="/">Home</Link>{' '}
                </div>
            );
        }
    }
}

interface CurrentlyPlayingState {
    currentlyPlaying?: SpotifyApi.CurrentlyPlayingResponse;
    spotifyApi?: SpotifyWebApi.SpotifyWebApiJs;
}
export class CurrentlyPlaying extends React.PureComponent<{ userConnection: UserConnection }, CurrentlyPlayingState> {
    // see recommended pattern : https://github.com/reactjs/rfcs/issues/26

    static getDerivedStateFromProps(nextProps: { userConnection: UserConnection }, prevState: CurrentlyPlayingState) {
        let newApi = nextProps.userConnection ? nextProps.userConnection.spotifyApi : undefined;
        if (!prevState || newApi !== prevState.spotifyApi)
            return {
                spotifyApi: newApi
            };

        return null;
    }

    componentDidMount() {
        this.state.spotifyApi &&
            this.state.spotifyApi.getMyCurrentPlayingTrack((error, results) => {
                this.setState({ currentlyPlaying: results });
            });
    }

    render() {
        let { currentlyPlaying } = this.state;

        return (
            <div>
                Currently playing :
                {currentlyPlaying && currentlyPlaying.item ? <div>{currentlyPlaying.item.name}</div> : <div>Nothing</div>}
            </div>
        );
    }
}
