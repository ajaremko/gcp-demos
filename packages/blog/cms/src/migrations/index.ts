import * as migration_20260828_220042 from './20260828_220042';
import * as migration_20260828_233530_initial from './20260828_233530_initial';

export const migrations = [
  {
    up: migration_20260828_220042.up,
    down: migration_20260828_220042.down,
    name: '20260828_220042',
  },
  {
    up: migration_20260828_233530_initial.up,
    down: migration_20260828_233530_initial.down,
    name: '20260828_233530_initial'
  },
];
