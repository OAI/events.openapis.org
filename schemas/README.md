# Data schemas

JSON Schema (draft 2020-12) for every hand-authored YAML file under `data/`.
They exist to catch the mistakes that are otherwise silent: a mistyped key is
dropped at build time without a word, and an `event_date` the parser can't read
loses the live countdown rather than failing.

| Schema                          | Applies to                                      |
| ------------------------------- | ----------------------------------------------- |
| `event.schema.json`             | `data/<year>/<slug>/event.yaml`                 |
| `speakers.schema.json`          | `data/speakers/speakers.yaml` (global registry) |
| `speakers.override.schema.json` | `data/<year>/<slug>/speakers/speakers.yaml`     |
| `events.order.schema.json`      | `data/events.order.yml`                         |

The two speakers schemas share one entry shape: the override schema `$ref`s
`speakers.schema.json#/$defs/entry`, and the registry adds `name` to the
required list. Everything else is self-contained.

## Editor support

`.vscode/settings.json` maps the globs above, so the schemas apply as soon as
the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
is installed — completion, hover docs and inline errors, no per-file modeline.

Editors that talk to `yaml-language-server` directly (Neovim, Helix, ...) read
the same schemas; point them at `schemas/` the same way, or add a modeline to a
single file:

```yaml
# yaml-language-server: $schema=../../../schemas/event.schema.json
```

## Validating from the command line

Not wired into `npm run lint` or CI, because it would mean adding a JSON Schema
validator to `devDependencies`. To run it ad hoc:

```sh
npx --yes ajv-cli@5 validate --spec=draft2020 -s schemas/event.schema.json -d "data/*/*/event.yaml"
```

`speakers.override.schema.json` also needs the registry loaded, since it refs it:

```sh
npx --yes ajv-cli@5 validate --spec=draft2020 \
  -r schemas/speakers.schema.json \
  -s schemas/speakers.override.schema.json -d "data/*/*/speakers/speakers.yaml"
```

## Keeping them honest

The schemas encode what `src/lib/events.ts` and `src/lib/speakers.ts` actually
read, including the `event_date` grammar their date parsers accept. When either
module grows a field, add it here too — `additionalProperties: false` means an
unlisted field is a hard error, which is the point, but it also means the
schema has to move first.
