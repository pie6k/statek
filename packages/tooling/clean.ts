import del from 'del';
import path from 'path';

const rootPath = path.resolve(__dirname, '../..');

async function perform() {
  await del('packages/**/lib/**/*.js', { cwd: rootPath });
  await del('packages/**/types/*.d.ts', { cwd: rootPath });
}

perform();
