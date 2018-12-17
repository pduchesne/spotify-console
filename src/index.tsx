import * as ReactDOM from 'react-dom';
import * as React from 'react';
import * as SpotifyWebApi from 'spotify-web-api-js';
import { BrowserRouter, Route } from 'react-router-dom';
import { SpotifyCallback, SpotifyAuthenticateButton, CurrentlyPlaying } from './services/spotify/spotify';

export interface UserConnection {
    spotifyApi?: SpotifyWebApi.SpotifyWebApiJs;
    spotifyProfile?: SpotifyApi.CurrentUsersProfileResponse;
}
interface AppState {
    userConnection: UserConnection;
}

export const UserContext = React.createContext<UserConnection>({});

export class App extends React.PureComponent<{}, AppState> {
    state = { userConnection: {} };

    authenticateSpotify = (token: string) => {
        let userConnection: UserConnection = {};
        if (token) {
            userConnection.spotifyApi = new SpotifyWebApi();
            userConnection.spotifyApi.setAccessToken(token);
            userConnection.spotifyApi.getMe().then(user => {
                this.setState({
                    userConnection: { ...userConnection, spotifyProfile: user }
                });
            });
        }

        this.setState({
            userConnection: userConnection
        });
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
                                    <CurrentlyPlaying userConnection={this.state.userConnection} />
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

class Header extends React.PureComponent<{ userConnection: UserConnection }, {}> {
    render() {
        let { userConnection } = this.props;

        let rootUrl = window.location.protocol + '//' + window.location.host;

        if (userConnection.spotifyApi) {
            if (userConnection.spotifyProfile) return <h2>Spotify Console for {userConnection.spotifyProfile.display_name}</h2>;
            else {
                return <div>Loading profile ...</div>;
            }
        } else
            return (
                <div>
                    Not authenticated
                    <SpotifyAuthenticateButton
                        callbackUrl={rootUrl + '/callback/spotify'}
                        spotifyClientId="351c8186ba274223974a895974580b87"
                    />
                </div>
            );
    }
}

ReactDOM.render(<App />, document.getElementById('index'));
