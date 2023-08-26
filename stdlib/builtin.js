const data = require("./../build/data");

module.exports.concat = data.newFunction(null, [
  {type: data.Type.String},
  {type: data.Type.Any}
], (arg0, arg1) => {
  return new data.Value(data.Type.String,
      arg0.cast(data.Type.String).data + arg1.cast(data.Type.String).data);
});

module.exports.random = data.newFunction(null, [], () => {
  return new data.Value(data.Type.Number, Math.random());
});

module.exports.write = data.newFunction(null, [
  {type: data.Type.Any}
], (arg) => {
  process.stdout.write(arg.data.toString());
  return arg;
});
