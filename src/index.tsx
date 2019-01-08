import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import {
    SpotifyCallback,
    PlayerHistory,
    TopTracks,
    PlayButton,
    DeviceSelector,
    CurrentlyPlaying,
    PlayableItemsPromiseList
} from './react/spotify';
import { setProxifyUrlFunc } from 'am-scraper';
import { PROXY_URL } from 'build-constants';
import { Grid, Paper } from '@material-ui/core';
import {
    getAuthenticationUrl,
    SpotifyService,
    PlayerEvent,
    DeviceChanged,
    TrackChanged,
    ContextChanged,
    PlayerStateChanged
} from 'services/spotify/spotify';
import { AMSimilar } from 'react/am';
import { PromiseComponent } from 'react/utils';

/* Set proxy to use for am-scraper */
var isNode = new Function('try {return this===global;}catch(e){return false;}');
function proxifyUrl(url: string) {
    if (PROXY_URL && !isNode()) return PROXY_URL + encodeURI(url);
    else return url;
}
setProxifyUrlFunc(proxifyUrl);

export interface UserConnection {
    spotifyService: SpotifyService;
    spotifyProfile?: SpotifyApi.CurrentUsersProfileResponse;
    spotifyDevices?: SpotifyApi.UserDevice[];
    selectedDeviceId?: string;
}
interface AppState {
    userConnection?: UserConnection;
}

export const UserContext = React.createContext<UserConnection | undefined>(undefined);

export class App extends React.PureComponent<{}, AppState> {
    state: AppState = { userConnection: undefined };

    authenticateSpotify = (token: string) => {
        if (token) {
            let spotifyService = new SpotifyService(token);

            //TODO if userConnection already exists in state, dismantle it

            let userConnection = {
                spotifyService: spotifyService
            };

            this.setState({ userConnection: userConnection });

            spotifyService
                .getApi()
                .getMe()
                .then(user => {
                    this.setState({
                        userConnection: this.state.userConnection && { ...this.state.userConnection, spotifyProfile: user }
                    });
                });

            spotifyService
                .getApi()
                .getMyDevices()
                .then(devicesResponse => {
                    this.setState({
                        userConnection: this.state.userConnection && {
                            ...this.state.userConnection,
                            spotifyDevices: devicesResponse.devices
                        }
                    });
                });
        } else {
            this.setState({
                userConnection: undefined
            });
        }
    };

    render() {
        return (
            <UserContext.Provider value={this.state.userConnection}>
                <BrowserRouter>
                    <div>
                        <Route
                            exact
                            path="/"
                            render={props => {
                                if (this.state.userConnection) return <DashBoard userConnection={this.state.userConnection} />;
                                else {
                                    let rootUrl = window.location.protocol + '//' + window.location.host;
                                    let authUrl = getAuthenticationUrl(rootUrl + '/callback/spotify', '351c8186ba274223974a895974580b87');

                                    window.location.href = authUrl;
                                    return null;
                                }
                            }}
                        />
                        <Route
                            exact
                            path="/callback/spotify"
                            render={props => <SpotifyCallback {...props} setToken={this.authenticateSpotify} />}
                        />
                    </div>
                </BrowserRouter>
            </UserContext.Provider>
        );
    }
}

class Header extends React.PureComponent<{ userConnection: UserConnection }, {}> {
    render() {
        let { userConnection } = this.props;

        if (userConnection.spotifyProfile) return <h2>Spotify Console for {userConnection.spotifyProfile.display_name}</h2>;
        else {
            return <div>Loading profile ...</div>;
        }
    }
}

class DashBoardState {
    is_playing: boolean;
    progress_ms?: number;
    selectedDeviceId?: string;
    currentTrack?: SpotifyApi.TrackObjectFull;
    currentContext?: SpotifyApi.ContextObject;

    currentlyPlayingObject?: SpotifyApi.CurrentlyPlayingObject;
    recentTracks?: SpotifyApi.PlayHistoryObject[];
}

class DashBoard extends React.PureComponent<{ userConnection: UserConnection }, DashBoardState> {
    state: DashBoardState = { is_playing: false };

    constructor(props: { userConnection: UserConnection }) {
        super(props);
        this.renderPlayTrackAction = this.renderPlayTrackAction.bind(this);
        this.renderPlayArtistAction = this.renderPlayArtistAction.bind(this);
    }

    renderPlayTrackAction = (trackUri: string) => (
        <PlayButton trackUris={[trackUri]} spotifyService={this.props.userConnection.spotifyService} />
    );

    renderPlayArtistAction = (artistName: string) => (
        <PromiseComponent
            args={artistName}
            promiseFn={(artistName: string) => this.props.userConnection.spotifyService.getArtistByName(artistName)}
            render={artist => artist && <PlayButton contextUri={artist.uri} spotifyService={this.props.userConnection.spotifyService} />}
        />
    );

    selectPlaybackDevice = (deviceId: string) => {
        this.props.userConnection.spotifyService.currentDeviceId = deviceId;
        this.setState({
            selectedDeviceId: deviceId
        });
    };

    processPlayerEvent(evt: PlayerEvent<any>) {
        // track individual changes
        if (evt instanceof DeviceChanged) this.setState({ selectedDeviceId: evt.newValue });
        if (evt instanceof TrackChanged) {
            this.setState({ currentTrack: evt.newValue });

            // track has changed --> reload history
            this.props.userConnection.spotifyService
                .getApi()
                .getMyRecentlyPlayedTracks()
                .then(recentTracks => this.setState({ recentTracks: recentTracks.items }));
        }
        if (evt instanceof ContextChanged) this.setState({ currentContext: evt.newValue });
        if (evt instanceof PlayerStateChanged) this.setState(evt.newValue);

        // force update of currentlyPlayingState
        this.setState({ currentlyPlayingObject: this.props.userConnection.spotifyService.monitor.currentState });
    }

    componentDidMount() {
        // see recommended pattern : https://github.com/reactjs/rfcs/issues/26

        this.props.userConnection.spotifyService.playerEvents().subscribe(
            this.processPlayerEvent.bind(this)
            // ,e => console.log('onError: %s', e)
        );
        this.setState({ currentlyPlayingObject: this.props.userConnection.spotifyService.monitor.currentState });
    }

    renderWidgetLine(widgets: JSX.Element[]) {
        return (
            <Grid container spacing={24}>
                {widgets.map((widget, idx) => (
                    <Grid item xs key={idx}>
                        <Paper>{widget}</Paper>
                    </Grid>
                ))}
            </Grid>
        );
    }

    renderArtistWidgets(): JSX.Element[] {
        let widgets: JSX.Element[] = [];

        let currentTrack = this.state.currentlyPlayingObject && this.state.currentlyPlayingObject.item;
        if (currentTrack) {
            widgets.push(
                <div>
                    Artist Top Tracks
                    <PlayableItemsPromiseList
                        args={currentTrack.artists[0].id}
                        promiseFn={(artistId: string) =>
                            this.props.userConnection.spotifyService
                                .getApi()
                                .getArtistTopTracks(artistId, 'from_token')
                                .then(response => response.tracks)
                        }
                        renderPlayAction={trackUri => (
                            <PlayButton trackUris={[trackUri]} spotifyService={this.props.userConnection.spotifyService} />
                        )}
                    />
                </div>
            );

            widgets.push(
                <div>
                    Related Artists
                    <PlayableItemsPromiseList
                        args={currentTrack.artists[0].id}
                        promiseFn={(artistId: string) =>
                            this.props.userConnection.spotifyService
                                .getApi()
                                .getArtistRelatedArtists(artistId)
                                .then(response => response.artists)
                        }
                        renderPlayAction={artistUri => (
                            <PlayButton contextUri={artistUri} spotifyService={this.props.userConnection.spotifyService} />
                        )}
                    />
                </div>
            );

            widgets.push(<AMSimilar query={currentTrack.artists[0].name} renderPlayAction={this.renderPlayArtistAction} />);
        }

        return widgets;
    }

    renderUserWidgets(): JSX.Element[] {
        let widgets: JSX.Element[] = [];

        if (this.state.recentTracks)
            widgets.push(<PlayerHistory tracks={this.state.recentTracks} renderPlayAction={this.renderPlayTrackAction} />);

        widgets.push(<TopTracks spotifyService={this.props.userConnection.spotifyService} renderPlayAction={this.renderPlayTrackAction} />);

        return widgets;
    }

    render() {
        let { userConnection } = this.props;

        return (
            <>
                <Header userConnection={userConnection} />
                <DeviceSelector
                    selected={this.state.selectedDeviceId}
                    devices={userConnection.spotifyDevices}
                    onchange={this.selectPlaybackDevice}
                />
                <CurrentlyPlaying currentlyPlaying={this.state.currentlyPlayingObject} spotifyService={userConnection.spotifyService} />

                {this.renderWidgetLine(this.renderArtistWidgets())}
                {this.renderWidgetLine(this.renderUserWidgets())}
            </>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('index'));
