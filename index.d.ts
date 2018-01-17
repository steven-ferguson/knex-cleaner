/// <reference types="node" />

declare module 'knex-cleaner' {
  import * as Knex from 'knex'
  // See https://github.com/steven-ferguson/knex-cleaner
  interface CleanOptions {
    mode?: 'truncate' | 'delete'
    ignoreTables?: string[]
    restartIdentity?: true // Used to tell PostgresSQL to reset the ID counter
  }

  export function clean(knex: Knex, opts?: CleanOptions): Promise<void>
}
