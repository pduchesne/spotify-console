import React = require('react');

type PromiseComponentProps<T, U> = {
    promiseFn: (arg: U) => Promise<T>;
    args: U;
    render: (result: T) => JSX.Element | undefined;
};
export class PromiseComponent<T, U> extends React.Component<PromiseComponentProps<T, U>, {}> {
    state: { resolution?: T } = {};

    fetchPromise() {
        this.props.promiseFn(this.props.args).then(r => this.setState({ resolution: r }));
    }

    componentDidMount() {
        this.fetchPromise();
    }

    componentDidUpdate(prevProps: PromiseComponentProps<T, U>) {
        if (prevProps.args != this.props.args) this.fetchPromise();
    }

    render() {
        let { resolution } = this.state;

        if (resolution) return this.props.render(resolution);
        else {
            return null;
        }
    }
}
