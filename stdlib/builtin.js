const data = require("./../build/data");

module.exports.random = {
  type: data.Type.Function,
  context: global.state,
  params: [],
  native() {
    return {
      type: data.Type.Number,
      value: Math.random()
    };
  }
};

module.exports.write = {
  type: data.Type.Function,
  context: global.state,
  params: [
    {type: data.Type.String}
  ],
  native(arg) {
    process.stdout.write(arg.value.toString());
    return arg;
  }
};
