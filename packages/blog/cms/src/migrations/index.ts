import * as migration_20260828_220042 from './20260828_220042';

export const migrations = [
  {
    up: migration_20260828_220042.up,
    down: migration_20260828_220042.down,
    name: '20260828_220042'
  },
];
