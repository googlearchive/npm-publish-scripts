'use strict';

const BUILD_OUTPUT_PATH = './build';
const SRC_PATH = './src';

const gulp = require('gulp');
const del = require('del');
const path = require('path');
const postcss = require('gulp-postcss');
const cssimport = require('gulp-cssimport');
const cssnext = require('postcss-cssnext');
const cssnano = require('cssnano');

gulp.task('clean', () => {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del([BUILD_OUTPUT_PATH]);
});

gulp.task('copy-release-files', () => {
  return gulp.src([
    `${SRC_PATH}/**/*`,
    `!${SRC_PATH}/**/*.css`,
  ])
  .pipe(gulp.dest(BUILD_OUTPUT_PATH));
});

gulp.task('css-next', () => {
  const browserSupport = ['last 2 versions'];
  const processors = [
    cssnext({browsers: browserSupport, warnForDuplicates: false}),
    cssnano(),
  ];

  return gulp.src(SRC_PATH + '/**/*.css')
  .pipe(cssimport({}))
  .pipe(postcss(processors))
  .pipe(gulp.dest(BUILD_OUTPUT_PATH));
});

gulp.task('anchorjs', () => {
  return gulp.src('./node_modules/anchor-js/anchor.min.js')
  .pipe(gulp.dest(
    path.join(
      BUILD_OUTPUT_PATH,
      'themes/jekyll/third_party/anchor-js/'
    )
  ));
});

gulp.task('third-party', gulp.parallel('anchorjs'));

gulp.task('build', gulp.series('clean', gulp.parallel(
    'copy-release-files',
    'css-next',
    'third-party'
  )
));

gulp.task('watch', gulp.series(
  'build',
  () => {
    gulp.watch([`${SRC_PATH}/**/*`], gulp.series('build'));
  }
));

gulp.task('default', gulp.series('build'));
