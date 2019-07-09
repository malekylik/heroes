const validateOptions = require('schema-utils');

const { exec } = require('child_process');
const { getOptions } = require('loader-utils');

const schema = {
  type: 'object',
  properties: {
    path: {
      type: 'string'
    },
    option: {
      type: 'string'
    },
  }
};

module.exports = function (source) {
  const callback = this.async();
  const options = getOptions(this);

  validateOptions(schema, options, 'preprocessor-js-loader');

  const { path, option } = options;

  exec(`${path} -${option} ${this.resourcePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return callback(error);
    }

    callback(null, stdout);
  });
}
