const data = require("./../build/data");

module.exports.random = {
  type: data.Type.Function,
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
  params: [
    {type: data.Type.String}
  ],
  native(arg) {
    process.stdout.write(arg.data.toString());
    return arg;
  }
};
