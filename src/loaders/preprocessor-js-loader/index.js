const validateOptions = require('schema-utils');

const { exec } = require('child_process');
const { getOptions } = require('loader-utils');

const schema = {
  type: 'object',
  properties: {
    path: {
      type: 'string'
    },
    compilerOptions: {
      type: 'array'
    },
  }
};

module.exports = function (source) {
  const callback = this.async();
  const options = getOptions(this);

  validateOptions(schema, options, 'preprocessor-js-loader');

  const { path, compilerOptions } = options;

  const optionsStr = compilerOptions.map(option => `-${option}`).join(' ');

  exec(`${path} ${optionsStr} ${this.resourcePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return callback(error);
    }

    callback(null, stdout);
  });
}
