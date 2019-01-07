import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { SpotifyCallback, CurrentlyPlaying, DeviceSelector, ArtistPlayButton, PlayerHistory, TrackPlayButton } from './react/spotify';
import { setProxifyUrlFunc } from 'am-scraper';
import { PROXY_URL } from 'build-constants';
import { Button, Grid, Paper } from '@material-ui/core';
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
                            render={props => (
                                <>
                                    <Header {...props} userConnection={this.state.userConnection} />
                                    {/* TODO include Header in DashBoard and redirect this route automatically to authentication when needed*/

                                    this.state.userConnection && <DashBoard userConnection={this.state.userConnection} />}
                                </>
                            )}
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

class Header extends React.PureComponent<{ userConnection?: UserConnection }, {}> {
    render() {
        let { userConnection } = this.props;

        let rootUrl = window.location.protocol + '//' + window.location.host;

        if (userConnection) {
            if (userConnection.spotifyProfile) return <h2>Spotify Console for {userConnection.spotifyProfile.display_name}</h2>;
            else {
                return <div>Loading profile ...</div>;
            }
        } else
            return (
                <div>
                    Not authenticated
                    <Button
                        size="small"
                        href={getAuthenticationUrl(rootUrl + '/callback/spotify', '351c8186ba274223974a895974580b87')}
                        variant="contained"
                        color="primary">
                        Connect Spotify
                    </Button>
                </div>
            );
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

    renderWidgets(): JSX.Element[] {
        let widgets: JSX.Element[] = [];

        if (this.state.recentTracks)
            widgets.push(
                <PlayerHistory
                    tracks={this.state.recentTracks}
                    renderPlayAction={(trackUri: string) => (
                        <TrackPlayButton trackUri={trackUri} spotifyService={this.props.userConnection.spotifyService} />
                    )}
                />
            );

        let currentTrack = this.state.currentlyPlayingObject && this.state.currentlyPlayingObject.item;
        if (currentTrack)
            widgets.push(
                <AMSimilar
                    query={currentTrack.artists[0].name}
                    renderPlayAction={(artistName: string) => (
                        <ArtistPlayButton artistName={artistName} spotifyService={this.props.userConnection.spotifyService} />
                    )}
                />
            );

        return widgets;
    }

    render() {
        let { userConnection } = this.props;
        let widgets = this.renderWidgets();

        return (
            <>
                <DeviceSelector
                    selected={this.state.selectedDeviceId}
                    devices={userConnection.spotifyDevices}
                    onchange={this.selectPlaybackDevice}
                />
                <CurrentlyPlaying currentlyPlaying={this.state.currentlyPlayingObject} spotifyService={userConnection.spotifyService} />
                <Grid container spacing={24}>
                    {widgets.map((widget, idx) => (
                        <Grid item xs key={idx}>
                            <Paper>{widget}</Paper>
                        </Grid>
                    ))}
                </Grid>
            </>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('index'));
