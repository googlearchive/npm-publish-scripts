'use strict';

const TEST_OUTPUT_PATH = './test/output';
const DOCS_TEMPLATE_PATH = './src/docs-template';
const EXAMPLE_SITE_PATH = './test/example-site';

const gulp = require('gulp');
const del = require('del');
const spawn = require('child_process').spawn;

let globalJekyllProcess;

gulp.task('clean', () => {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del([TEST_OUTPUT_PATH]);
});

gulp.task('copy-docs-template', () => {
  return gulp.src(DOCS_TEMPLATE_PATH + '/**/*')
  .pipe(gulp.dest(TEST_OUTPUT_PATH));
});

gulp.task('copy-example-site', () => {
  return gulp.src(EXAMPLE_SITE_PATH + '/**/*')
  .pipe(gulp.dest(TEST_OUTPUT_PATH));
});

gulp.task('jekyll-serve', cb => {
  const jekyllCommand = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
  const params = ['exec', jekyllCommand, 'serve', '--trace'];
  globalJekyllProcess = spawn('bundle', params, {
    cwd: TEST_OUTPUT_PATH,
    stdio: 'inherit'
  });
  cb();
});

gulp.task('watch', () => {
  gulp.watch(DOCS_TEMPLATE_PATH + '/**/*', gulp.series('copy-docs-template'));
  gulp.watch(EXAMPLE_SITE_PATH + '/**/*', gulp.series('copy-example-site'));
})

gulp.task('default', gulp.series('clean', gulp.parallel('copy-docs-template', 'copy-example-site'), 'jekyll-serve', 'watch'));
