# bab ts
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/bab-ts/nodejs.yml?style=flat-square)](https://github.com/substrate-system/package/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/icons?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/bab-ts)](https://packagephobia.com/result?p=@substrate-system/bab-ts)
[![gzip size](https://img.shields.io/bundlephobia/minzip/@substrate-system/bab-ts?style=flat-square)](https://bundlephobia.com/@substrate-system/name/package/bab-ts)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


[Bab](https://worm-blossom.github.io/bab/) in TypeScript.

Bab is a cryptographic hash function that lets you incrementally verify parts
of the download, as they stream in.

[I made a kind of elaborate demo page for this](https://substrate-system.github.io/bab-ts/).

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [install](#install)
- [API](#api)
  * [ESM](#esm)
  * [Common JS](#common-js)
- [use](#use)
  * [JS](#js)
  * [pre-built JS](#pre-built-js)

<!-- tocstop -->

</details>

## install

Installation instructions

```sh
npm i -S @substrate-system/bab-ts
```

## API

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

### ESM
```js
import '@substrate-system/bab-ts'
```

### Common JS
```js
require('@substrate-system/bab-ts')
```

## use

### JS
```js
import '@substrate-system/bab-ts'
```

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/bab-ts/dist/module.min.js ./public
```

#### HTML
```html
<script type="module" src="./module.min.js"></script>
```

## Example

```ts
```
