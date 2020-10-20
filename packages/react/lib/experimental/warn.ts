import { warnOnce } from '../utils';

export function warnAboutExperimental(featureName: string) {
  warnOnce(
    `experimental__${featureName}`,
    `You're using experimental statek feature - ${featureName}.`,
  );
}
