'use strict';

const BUILD_OUTPUT_PATH = './build';
const SRC_PATH = './src';
const JEKYLL_THEME_PATH = './src/jekyll-theme';
const EXAMPLE_SITE_PATH = './test/example-site';

const gulp = require('gulp');
const del = require('del');
const postcss = require('gulp-postcss');
const cssimport = require('gulp-cssimport');
const cssnext = require('postcss-cssnext');
const cssnano = require('cssnano');
const spawn = require('child_process').spawn;

gulp.task('clean', () => {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del([BUILD_OUTPUT_PATH]);
});

gulp.task('dev-jekyll-theme', () => {
  return gulp.src(JEKYLL_THEME_PATH + '/**/*')
  .pipe(gulp.dest(BUILD_OUTPUT_PATH + '/docs/jekyll-theme'));
});

gulp.task('dev-example-site', () => {
  return gulp.src(EXAMPLE_SITE_PATH + '/**/*')
  .pipe(gulp.dest(BUILD_OUTPUT_PATH));
});

gulp.task('dev-jsdoc-build', (cb) => {
  spawn('./test/jsdoc-run.sh', [], {
    stdio: 'inherit',
  });
  cb();
});

gulp.task('jekyll-serve', (cb) => {
  const jekyllCommand = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
  const params = ['exec', jekyllCommand, 'serve', '--trace',
    '--config', './_config.yml'];
  spawn('bundle', params, {
    cwd: BUILD_OUTPUT_PATH + '/docs',
    stdio: 'inherit',
  });
  cb();
});

gulp.task('watch', () => {
  gulp.watch(JEKYLL_THEME_PATH + '/**/*', gulp.series('dev-jekyll-theme'));
  gulp.watch(EXAMPLE_SITE_PATH + '/**/*',
    gulp.series('dev-example-site', 'dev-jsdoc-build'));
});

gulp.task('dev', gulp.series('clean',
  gulp.parallel('dev-jekyll-theme', 'dev-example-site'),
  'dev-jsdoc-build', 'jekyll-serve', 'watch'));

gulp.task('copy-release-files', () => {
  return gulp.src(SRC_PATH + '/**/*')
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

gulp.task('build', gulp.series('clean', 'copy-release-files', 'css-next'));

gulp.task('default', gulp.series('dev'));
