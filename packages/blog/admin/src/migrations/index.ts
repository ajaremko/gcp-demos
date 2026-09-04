import * as migration_20260828_220042 from './20260828_220042';
import * as migration_20260828_233530_initial from './20260828_233530_initial';
import * as migration_20260904_024446_tags from './20260904_024446_tags';

export const migrations = [
  {
    up: migration_20260828_220042.up,
    down: migration_20260828_220042.down,
    name: '20260828_220042',
  },
  {
    up: migration_20260828_233530_initial.up,
    down: migration_20260828_233530_initial.down,
    name: '20260828_233530_initial',
  },
  {
    up: migration_20260904_024446_tags.up,
    down: migration_20260904_024446_tags.down,
    name: '20260904_024446_tags'
  },
];
