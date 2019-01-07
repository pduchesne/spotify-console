import * as React from 'react';
import { Redirect, Link } from 'react-router-dom';
import * as queryString from 'query-string';
import Icon from '@material-ui/core/Icon';
import { IconButton, Select, MenuItem } from '@material-ui/core';
import { SpotifyService } from 'services/spotify/spotify';

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

export class ArtistPlayButton extends React.PureComponent<
    { artistName: string; spotifyService: SpotifyService },
    { artist?: SpotifyApi.ArtistObjectFull }
> {
    state: { artist?: SpotifyApi.ArtistObjectFull } = { artist: undefined };

    componentDidMount() {
        let { spotifyService, artistName } = this.props;
        if (spotifyService && artistName) spotifyService.getArtistByName(artistName).then(artist => this.setState({ artist: artist }));
    }

    render() {
        let { spotifyService } = this.props;
        let { artist } = this.state;

        if (artist !== undefined) {
            return (
                <IconButton style={styles.button} color="primary" onClick={() => spotifyService.play(artist!.uri)}>
                    <Icon style={styles.icon}>play_circle_outline</Icon>
                </IconButton>
            );
        } else {
            return null;
        }
    }
}

interface CurrentlyPlayingState {
    //currentlyPlaying?: SpotifyApi.CurrentlyPlayingResponse;
}
export class CurrentlyPlaying extends React.PureComponent<
    { currentlyPlaying?: SpotifyApi.CurrentlyPlayingObject; spotifyService: SpotifyService },
    CurrentlyPlayingState
> {
    render() {
        let { currentlyPlaying } = this.props;
        let spotifyService = this.props.spotifyService;

        const renderNowPlaying = (currentlyPlaying: SpotifyApi.CurrentlyPlayingResponse) => (
            <>
                <div>
                    {currentlyPlaying.item!.name}
                    <IconButton color="primary" onClick={() => spotifyService.getApi().skipToPrevious()}>
                        <Icon>skip_previous</Icon>
                    </IconButton>
                    {currentlyPlaying.is_playing ? (
                        <IconButton color="primary" onClick={() => spotifyService.getApi().pause()}>
                            <Icon>pause_circle_outline</Icon>
                        </IconButton>
                    ) : (
                        <IconButton color="primary" onClick={() => spotifyService.getApi().play()}>
                            <Icon>play_circle_outline</Icon>
                        </IconButton>
                    )}
                    <IconButton color="primary" onClick={() => spotifyService.getApi().skipToNext()}>
                        <Icon>skip_next</Icon>
                    </IconButton>
                </div>
            </>
        );

        return (
            <div>
                Currently playing :{currentlyPlaying && currentlyPlaying.item ? renderNowPlaying(currentlyPlaying) : <div>Nothing</div>}
            </div>
        );
    }
}

export class DeviceSelector extends React.PureComponent<
    { selected?: string; devices?: SpotifyApi.UserDevice[]; onchange: (deviceId?: string) => void },
    {}
> {
    render() {
        let devices = this.props.devices;

        return (
            <div>
                <Select
                    value={this.props.selected || ''}
                    onChange={e => this.props.onchange(e.target.value == '' ? undefined : e.target.value)}
                    inputProps={
                        {
                            //allowEmpty: true
                            //  name: 'age',
                            //  id: 'age-simple',
                        }
                    }>
                    <MenuItem value="">
                        <em>None</em>
                    </MenuItem>
                    {devices &&
                        devices
                            .filter(device => device.id != null)
                            .map(device => (
                                <MenuItem key={device.id!} value={device.id!} style={{ fontWeight: device.is_active ? 'bold' : undefined }}>
                                    {device.name}
                                </MenuItem>
                            ))}
                </Select>
            </div>
        );
    }
}
