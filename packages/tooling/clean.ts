import del from 'del';
import path from 'path';

const rootPath = path.resolve(__dirname, '../..');

async function perform() {
  del('packages/**/lib/**/*.js', { cwd: rootPath });
}

perform();
