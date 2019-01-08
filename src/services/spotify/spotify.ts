import * as SpotifyWebApi from 'spotify-web-api-js';
import { Subject, Observable } from 'rxjs';

const required_roles = [
    'user-top-read',
    'user-read-recently-played',
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state'
];
export const getAuthenticationUrl = (rootUrl: string, clientId: string) =>
    `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(rootUrl)}&scope=${encodeURIComponent(
        required_roles.join(' ')
    )}&response_type=token&state=123`;

export class PlayerEvent<T> {
    oldValue: T;
    newValue: T;

    constructor(newValue: T, oldValue: T) {
        this.newValue = newValue;
        this.oldValue = oldValue;
    }
}

export class DeviceChanged extends PlayerEvent<string | undefined> {}
export class TrackChanged extends PlayerEvent<SpotifyApi.TrackObjectFull | undefined> {}
export class ContextChanged extends PlayerEvent<SpotifyApi.ContextObject | undefined> {}
export class PlayerStateChanged extends PlayerEvent<{ progress_ms?: number; is_playing: boolean }> {}

class PlayerMonitor {
    spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
    currentState: SpotifyApi.CurrentlyPlayingResponse;

    timerId?: number;
    subject: Subject<PlayerEvent<any>>;

    constructor(spotifyApi: SpotifyWebApi.SpotifyWebApiJs) {
        this.spotifyApi = spotifyApi;
        this.subject = new Subject();
    }

    refresh() {
        this.spotifyApi.getMyCurrentPlayingTrack((error, results) => {
            let oldState = this.currentState;
            this.currentState = results;

            if (
                oldState == null ||
                (results.device && oldState.device && results.device.id != oldState.device.id) ||
                ((results.device == null || oldState.device == null) && results.device != oldState.device)
            )
                this.subject.next(
                    new DeviceChanged(
                        results.device && results.device.id != null ? results.device.id : undefined,
                        oldState && oldState.device && oldState.device.id != null ? oldState.device.id : undefined
                    )
                );

            if (
                oldState == null ||
                (results.item != null && oldState.item != null && results.item.id != oldState.item.id) ||
                // one of them is null
                ((results.item == null || oldState.item == null) && results.item != oldState.item)
            )
                this.subject.next(
                    new TrackChanged(results.item ? results.item : undefined, oldState && oldState.item ? oldState.item : undefined)
                );

            if (oldState == null || results.progress_ms != oldState.progress_ms || results.is_playing != oldState.is_playing)
                this.subject.next(
                    new PlayerStateChanged(
                        { progress_ms: results.progress_ms == null ? undefined : results.progress_ms, is_playing: results.is_playing },
                        {
                            progress_ms: oldState && oldState.progress_ms != null ? oldState.progress_ms : undefined,
                            is_playing: oldState && oldState.is_playing
                        }
                    )
                );

            if (
                oldState == null ||
                (results.context != null && oldState.context != null && results.context.uri != oldState.context.uri) ||
                // one of them is null
                ((results.context == null || oldState.context == null) && results.context != oldState.context)
            )
                this.subject.next(
                    new ContextChanged(
                        results.context ? results.context : undefined,
                        oldState && oldState.context ? oldState.context : undefined
                    )
                );
        });
    }

    start() {
        if (this.timerId !== undefined) {
            clearInterval(this.timerId);
        }
        this.refresh();
        this.timerId = setInterval(() => this.refresh(), 3000);
    }

    stop() {
        if (this.timerId !== undefined) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }

    observable() {
        return this.subject;
    }
}

export class SpotifyService {
    spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
    currentDeviceId?: string;
    monitor: PlayerMonitor;

    constructor(apiToken: string) {
        this.spotifyApi = new SpotifyWebApi();
        this.spotifyApi.setAccessToken(apiToken);
        this.monitor = new PlayerMonitor(this.spotifyApi);

        // TODO lazy-start monitor
        this.monitor.start();
    }

    getArtistByName(name: string): Promise<SpotifyApi.ArtistObjectFull | undefined> {
        return this.spotifyApi
            .searchArtists(name, { limit: 1 })
            .then(response => (response.artists.items.length > 0 ? response.artists.items[0] : undefined));
    }

    play(trackUris?: string[], contextUri?: string, device_id?: string) {
        let options: SpotifyApi.PlayParameterObject = {};
        if (trackUris && trackUris.length > 0) options.uris = trackUris;

        if (contextUri) options.context_uri = contextUri;
        // spotifyApi chokes on undefined device_id
        if (device_id || this.currentDeviceId) options.device_id = device_id || this.currentDeviceId;

        this.spotifyApi.play(options);
    }

    getApi() {
        return this.spotifyApi;
    }

    playerEvents(): Observable<PlayerEvent<any>> {
        return this.monitor.observable();
    }
}
