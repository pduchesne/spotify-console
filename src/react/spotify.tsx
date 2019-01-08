import * as React from 'react';
import { Redirect, Link } from 'react-router-dom';
import * as queryString from 'query-string';
import Icon from '@material-ui/core/Icon';
import { IconButton, Select, MenuItem } from '@material-ui/core';
import { SpotifyService } from 'services/spotify/spotify';
import { PromiseComponent } from './utils';

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

export class PlayButton extends React.PureComponent<{ trackUris?: string[]; contextUri?: string; spotifyService: SpotifyService }> {
    render() {
        return (
            <IconButton
                style={styles.button}
                color="primary"
                onClick={() => this.props.spotifyService.play(this.props.trackUris, this.props.contextUri)}>
                <Icon style={styles.icon}>play_circle_outline</Icon>
            </IconButton>
        );
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
        );
    }
}

export class PlayerHistory extends React.PureComponent<
    { tracks: SpotifyApi.PlayHistoryObject[]; renderPlayAction?: (trackUri: string) => JSX.Element },
    {}
> {
    render() {
        return (
            <div>
                PlayerHistory
                <ul>
                    {this.props.tracks.map((track, idx) => (
                        <li key={track.track.id + '_' + idx}>
                            {track.track.name} {this.props.renderPlayAction ? this.props.renderPlayAction(track.track.uri) : null}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}

type TopTracksProps = {
    spotifyService: SpotifyService;
    renderPlayAction?: (trackUri: string) => JSX.Element;
};

type TopTracksState = {
    range?: string;
};

export class TopTracks extends React.PureComponent<TopTracksProps, TopTracksState> {
    state: TopTracksState = { range: 'medium_term' };

    fetchTopTracks(range?: string): Promise<SpotifyApi.UsersTopTracksResponse> {
        let options: { time_range?: string } = {};

        if (range) options.time_range = range;
        return this.props.spotifyService.getApi().getMyTopTracks(options);
    }

    render() {
        return (
            <div>
                Top Tracks
                <Select
                    value={this.state.range || ''}
                    onChange={e => this.setState({ range: e.target.value == '' ? undefined : e.target.value })}>
                    <MenuItem value="short_term">Short Term</MenuItem>
                    <MenuItem value="medium_term">Medium Term</MenuItem>
                    <MenuItem value="long_term">Long Term</MenuItem>
                </Select>
                <PlayableItemsPromiseList
                    args={this.state.range}
                    promiseFn={(range: string) => this.fetchTopTracks(range).then(response => response.items)}
                    renderPlayAction={this.props.renderPlayAction}
                />
            </div>
        );
    }
}

type PlayableItem = {
    name: string;
    id: string;
    uri: string;
};

type PlayableItemsPromiseListProps<U> = {
    promiseFn: (arg: U) => Promise<PlayableItem[]>;
    args: U;
    renderPlayAction?: (itemUri: string) => JSX.Element;
};

export class PlayableItemsPromiseList<U> extends React.PureComponent<PlayableItemsPromiseListProps<U>> {
    render() {
        return (
            <div>
                <PromiseComponent
                    args={this.props.args}
                    promiseFn={this.props.promiseFn}
                    render={result =>
                        result && (
                            <ul>
                                {result.map((item, idx) => (
                                    <li key={item.id + '_' + idx}>
                                        {item.name} {this.props.renderPlayAction ? this.props.renderPlayAction(item.uri) : null}
                                    </li>
                                ))}
                            </ul>
                        )
                    }
                />
            </div>
        );
    }
}
