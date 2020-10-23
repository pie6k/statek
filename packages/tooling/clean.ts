import del from 'del';
import path from 'path';

const rootPath = path.resolve(__dirname, '../..');

async function perform() {
  await del('packages/**/lib/**/*.js', { cwd: rootPath });
  await del('packages/*/types', { cwd: rootPath });
  await del('packages/docs/build', { cwd: rootPath });
  await del('packages/docs/.docusaurus', { cwd: rootPath });
}

perform();
