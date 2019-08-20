const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const express = require('express');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
const Loadable = require('react-loadable');
const { StaticRouter } = require('react-router-dom');
const { Provider } = require('react-redux');
const serialize = require('serialize-javascript');
// eslint-disable-next-line import/no-extraneous-dependencies
const color = require('ansi-colors');
const { getBundles } = require('react-loadable/webpack');
const {
  App,
} = require('./dist/node/main.node');
const manifest = require('./dist/react-loadable.json');
const createStore = require('./dist/node/redux.node').default;

function server(port) {
  const _app = express();

  _app.use(express.static('dist/client'));

  _app.get('*', (req, res) => {
    const context = {};
    const modules = [];

    // ... do stuff to get data
    const data = { hits: { hits: 10 } };
    const store = createStore(data);

    const app = React.createElement(
      Provider,
      { store },
      React.createElement(
        StaticRouter,
        { location: req.url, context },
        React.createElement(
          Loadable.Capture,
          { report: (moduleName) => modules.push(moduleName) },
          React.createElement(App),
        ),
      ),
    );

    const markup = renderToStaticMarkup(app);
    const bundles = getBundles(manifest, modules);

    fs.readFile('./dist/client/assets/index.html', 'utf-8', (err, html) => {
      if (err) {
        throw err;
      }

      let _html = html.replace(/{react_markup}/, markup);
      _html = _html.replace(/{redux_data}/, `<script type="text/javascript">window.__redux_data=${serialize(store.getState())}</script>`);
      if (process.env.NODE_ENV === 'development') {
        _html = _html.replace(/"\/bundle.js"/, `http://localhost:${process.env.DEV_PORT}/build/bundle.js`);
        _html = _html.replace(/"\/main.css"/, `http://localhost:${process.env.DEV_PORT}/build/main.css`);
      }

      _html = _html.replace(/{loadable_scripts}/, bundles.map(((bundle) => `<script src="${bundle.publicPath}"></script>`)).join('/n'));

      res.status(200).send(_html);
    });
  });

  Loadable.preloadAll().then(() => {
    _app.listen(port, () => {
      console.log(color.bold.green(`Ready on port ${port}`));
    });
  }).catch((err) => console.error(err));
}

server(process.env.PORT || 5000);
