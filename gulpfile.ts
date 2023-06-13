import * as gulp from "gulp";
import * as typescript from "gulp-typescript";
// import del from "del";
import nearley from "gulp-nearley";
import rename from "gulp-rename";
// import terser from "gulp-terser";

gulp.task("build-grammar", function () {
  return gulp.src("./src/grammar/index.ne")
      .pipe(nearley())
      .pipe(rename((filepath) => {
        filepath.extname = ".ts";
      }))
      .pipe(gulp.dest("./src/grammar/"))
});

gulp.task("build", gulp.series("build-grammar", function () {
  const tsProject = typescript.createProject("./tsconfig.json");
  return tsProject.src()
      .pipe(tsProject())
      .pipe(gulp.dest("./build/"));
}));

// gulp.task("dist", gulp.series("build-grammar", function () {
//   const ts_project = typescript.createProject("./tsconfig.production.json");
//   return gulp.src("./src/**/*.{js,ts}")
//       .pipe(ts_project())
//       .pipe(terser({
//         compress: true,
//         mangle: true,
//         output: {
//         }
//       }))
//       .pipe(gulp.dest("./dist/"));
// }));

// gulp.task("clean", () => {
//   return del([
//     "./build/",
//     "./dist/"
//   ]);
// });

// gulp.task("default", gulp.series("clean", "build"));
