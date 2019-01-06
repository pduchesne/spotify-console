import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { SpotifyCallback, CurrentlyPlaying } from './react/spotify';
import { setProxifyUrlFunc } from 'am-scraper';
import { PROXY_URL } from 'build-constants';
import { Button } from '@material-ui/core';
import { getAuthenticationUrl, SpotifyService } from 'services/spotify/spotify';

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
            let userConnection = {
                spotifyService: new SpotifyService(token)
            };

            spotifyService
                .getApi()
                .getMe()
                .then(user => {
                    this.setState({
                        userConnection: { ...userConnection, spotifyProfile: user }
                    });
                });

            this.setState({ userConnection: userConnection });
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
                                    {this.state.userConnection && (
                                        <CurrentlyPlaying spotifyService={this.state.userConnection.spotifyService} />
                                    )}
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

ReactDOM.render(<App />, document.getElementById('index'));
