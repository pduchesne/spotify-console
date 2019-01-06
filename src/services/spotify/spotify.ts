import * as SpotifyWebApi from 'spotify-web-api-js';

export const getAuthenticationUrl = (rootUrl: string, clientId: string) =>
    `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        rootUrl
    )}&scope=user-read-private%20user-read-email%20user-read-playback-state%20user-modify-playback-state&response_type=token&state=123`;

export class SpotifyService {
    spotifyApi: SpotifyWebApi.SpotifyWebApiJs;

    constructor(apiToken: string) {
        this.spotifyApi = new SpotifyWebApi();
        this.spotifyApi.setAccessToken(apiToken);
    }

    getArtistByName(name: string): Promise<SpotifyApi.ArtistObjectFull | undefined> {
        return this.spotifyApi
            .searchArtists(name, { limit: 1 })
            .then(response => (response.artists.items.length > 0 ? response.artists.items[0] : undefined));
    }

    play(artistUri: string) {
        this.spotifyApi.play({ context_uri: artistUri });
    }

    getApi() {
        return this.spotifyApi;
    }
}
