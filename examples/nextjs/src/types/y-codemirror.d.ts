// y-codemirror's package.json "exports" map hides its bundled type declarations from
// "bundler" module resolution, so declare the part of its API this demo uses.
declare module 'y-codemirror' {
  import type { Editor } from 'codemirror'
  import type * as Y from 'yjs'

  export class CodemirrorBinding {
    constructor(
      textType: Y.Text,
      codeMirror: Editor,
      awareness?: any | null,
      options?: { yUndoManager?: Y.UndoManager },
    )
    awareness: any
    destroy(): void
  }
}
