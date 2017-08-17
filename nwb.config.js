module.exports = {
  type: 'web-module',
  npm: {
    esModules: true,
    umd: false,
  },
  babel: {
    cherryPick: ['lodash'],
  },
};
