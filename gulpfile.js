const del = require("del");
const gulp = require("gulp");
const nearley = require("gulp-nearley");
const rename = require("gulp-rename");
const typescript = require("gulp-typescript");

gulp.task("clean", () => {
  return del(["./build/"]);
});

gulp.task("grammar", function () {
  return gulp.src("./src/grammar/index.ne")
      .pipe(nearley())
      .pipe(rename((filepath) => {
        filepath.extname = ".ts";
      }))
      .pipe(gulp.dest("./src/grammar/"))
});

gulp.task("commonjs", function () {
  const tsProject = typescript.createProject("./tsconfig.cjs.json");
  return tsProject.src()
      .pipe(tsProject())
      .pipe(gulp.dest("./build/commonjs/"));
});

gulp.task("types", function () {
  const tsProject = typescript.createProject("./tsconfig.types.json");
  return tsProject.src()
      .pipe(tsProject())
      .pipe(gulp.dest("./build/types/"));
});

gulp.task("build", gulp.series("grammar", "commonjs", "types"));
gulp.task("default", gulp.series("build"));
