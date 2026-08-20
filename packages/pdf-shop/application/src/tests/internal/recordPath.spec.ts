import { describe, it, expect } from 'vitest'

import { recordDir, buildRecordPath } from '../../lib/internal/data/recordPath'

describe('recordPath', () => {
  describe('recordDir', () => {
    it.each(['created', 'paid', 'generated'] as const)(
      'returns <dataRoot>/%s',
      (recordType) => {
        expect(recordDir('/data', recordType)).toBe(`/data/${recordType}`)
      },
    )
  })

  describe('buildRecordPath', () => {
    it.each(['created', 'paid', 'generated'] as const)(
      'defaults to a .json extension under <dataRoot>/%s',
      (recordType) => {
        expect(
          buildRecordPath(
            '/data',
            recordType,
            '11111111-1111-4111-8111-111111111111',
          ),
        ).toBe(`/data/${recordType}/11111111-1111-4111-8111-111111111111.json`)
      },
    )

    it('uses an explicit extension when one is passed', () => {
      expect(
        buildRecordPath(
          '/data',
          'generated',
          '11111111-1111-4111-8111-111111111111',
          'txt',
        ),
      ).toBe('/data/generated/11111111-1111-4111-8111-111111111111.txt')
    })
  })
})
