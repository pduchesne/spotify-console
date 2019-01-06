import * as React from 'react';
import { Artist, searchArtists, similarArtists } from 'am-scraper';

interface AMSimilarProps {
    query: string;
    renderPlayAction?: (artistName: string) => JSX.Element;
}

interface AMSimilarState {
    currentQuery?: string;
    similarArtists: Artist[];
}

/* this cannot be a PureComponent because of the renderPlayAction prop */
export class AMSimilar extends React.Component<AMSimilarProps, AMSimilarState> {

    state: AMSimilarState = {similarArtists: []};

    static getDerivedStateFromProps(nextProps: AMSimilarProps, prevState: AMSimilarState) {
        if (nextProps.query !== prevState.currentQuery)
            return {
                currentQuery: nextProps.query,
                similarArtists: []
            };
        return null;
    }

    shouldComponentUpdate(nextProps: AMSimilarProps, nextState: AMSimilarState): boolean {
        return nextProps.query !== this.props.query || nextState.similarArtists != this.state.similarArtists;
    }

    loadArtists(query?: string) {
        if (query === undefined) this.setState({ similarArtists: [] });
        else
            searchArtists(query)
                // take first artist - return nothing if no artist found
                .then(artists => (artists.length > 0 ? similarArtists(artists[0]) : []))
                .then(similarArtists => {
                    this.setState({ similarArtists: similarArtists });
                });
    }

    componentDidMount() {
        this.loadArtists(this.props.query);
    }

    componentDidUpdate(prevProps: AMSimilarProps, prevState: AMSimilarState) {
        if (prevState.currentQuery != this.state.currentQuery) {
            this.loadArtists(this.state.currentQuery);
        }
    }

    render() {
        let { renderPlayAction } = this.props;
        let { similarArtists } = this.state;
        return (
            <div>
                Similar artists to {this.props.query}
                <ul>
                    {similarArtists.map(artist => (
                        <li key={artist.id}>
                            {artist.name} {renderPlayAction ? renderPlayAction(artist.name) : null}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
