import * as React from 'react';
import Button from '@material-ui/core/Button';
import { Redirect, Link } from 'react-router-dom';
import * as queryString from 'query-string';
import { UserConnection } from '../..';
import * as SpotifyWebApi from 'spotify-web-api-js';
import Icon from '@material-ui/core/Icon';
import { IconButton } from '@material-ui/core';
import { AMSimilar } from 'services/am/am';

const authUri = (rootUrl: string, clientId: string) =>
    `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        rootUrl
    )}&scope=user-read-private%20user-read-email%20user-read-playback-state%20user-modify-playback-state&response_type=token&state=123`;

export const SpotifyAuthenticateButton = (props: { callbackUrl: string; spotifyClientId: string }) => {
    return (
        <Button size="small" href={authUri(props.callbackUrl, props.spotifyClientId)} variant="contained" color="primary">
            Connect Spotify
        </Button>
    );
};

export class SpotifyCallback extends React.PureComponent<{ location: any; setToken: (token: string) => void }, {}> {
    state: { hasReceivedToken?: boolean } = {};

    componentDidMount() {
        let parsed = queryString.parse(this.props.location.hash);

        if (parsed.access_token) {
            this.props.setToken(parsed.access_token as string);
            this.setState({ hasReceivedToken: true });
        } else {
            this.setState({ hasReceivedToken: false });
        }
    }

    render() {
        if (this.state.hasReceivedToken === undefined) {
            return <div>Waiting for authentication ...</div>;
        } else if (this.state.hasReceivedToken) {
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

const styles = {
    button: {
        width: 20,
        height: 20,
        padding: 0
    },
    icon: {
        fontSize: 16
    }
};

class ArtistPlayButton extends React.PureComponent<
    { artistName: string; spotifyApi?: SpotifyWebApi.SpotifyWebApiJs },
    { artist?: SpotifyApi.ArtistObjectFull }
> {
    state: { artist?: SpotifyApi.ArtistObjectFull } = { artist: undefined };

    componentDidMount() {
        let { spotifyApi, artistName } = this.props;
        if (spotifyApi && artistName)
            spotifyApi
                .searchArtists(artistName, { limit: 1 })
                .then(response => (response.artists.items.length > 0 ? response.artists.items[0] : undefined))
                .then(artist => this.setState({ artist: artist }));
    }

    render() {
        let { spotifyApi } = this.props;
        let { artist } = this.state;

        if (artist !== undefined) {
            return (
                <IconButton style={styles.button} color="primary" onClick={() => spotifyApi!.play({ context_uri: artist!.uri })}>
                    <Icon style={styles.icon}>play_circle_outline</Icon>
                </IconButton>
            );
        } else {
            return null;
        }
    }
}

interface CurrentlyPlayingState {
    currentlyPlaying?: SpotifyApi.CurrentlyPlayingResponse;
    spotifyApi?: SpotifyWebApi.SpotifyWebApiJs;
}
export class CurrentlyPlaying extends React.PureComponent<{ userConnection: UserConnection }, CurrentlyPlayingState> {
    // see recommended pattern : https://github.com/reactjs/rfcs/issues/26

    state: CurrentlyPlayingState = {};

    static getDerivedStateFromProps(nextProps: { userConnection: UserConnection }, prevState: CurrentlyPlayingState) {
        let newApi = nextProps.userConnection ? nextProps.userConnection.spotifyApi : undefined;
        if (!prevState || newApi !== prevState.spotifyApi)
            return {
                spotifyApi: newApi
            };

        return null;
    }

    timer: any;
    componentDidMount() {
        this.refresh();
        // refresh 'currently playing' periodically
        this.timer = setInterval(() => this.refresh(), 3000);
    }

    refresh() {
        if (this.state.spotifyApi !== undefined)
            this.state.spotifyApi.getMyCurrentPlayingTrack((error, results) => {
                this.setState({ currentlyPlaying: results });
            });
    }

    render() {
        let { currentlyPlaying, spotifyApi } = this.state;

        const renderNowPlaying = (currentlyPlaying: SpotifyApi.CurrentlyPlayingResponse) => (
            <>
                <div>
                    {currentlyPlaying.item!.name}
                    <IconButton color="primary" onClick={() => spotifyApi!.skipToPrevious()}>
                        <Icon>skip_previous</Icon>
                    </IconButton>
                    {currentlyPlaying.is_playing ? (
                        <IconButton color="primary" onClick={() => spotifyApi!.pause()}>
                            <Icon>pause_circle_outline</Icon>
                        </IconButton>
                    ) : (
                        <IconButton color="primary" onClick={() => spotifyApi!.play()}>
                            <Icon>play_circle_outline</Icon>
                        </IconButton>
                    )}
                    <IconButton color="primary" onClick={() => spotifyApi!.skipToNext()}>
                        <Icon>skip_next</Icon>
                    </IconButton>
                </div>
                <AMSimilar
                    query={currentlyPlaying.item!.artists[0].name}
                    renderPlayAction={(artistName: string) => <ArtistPlayButton artistName={artistName} spotifyApi={spotifyApi} />}
                />
            </>
        );

        return (
            <div>
                Currently playing :{currentlyPlaying && currentlyPlaying.item ? renderNowPlaying(currentlyPlaying) : <div>Nothing</div>}
            </div>
        );
    }
}
