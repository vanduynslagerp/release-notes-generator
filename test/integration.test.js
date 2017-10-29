import {promisify} from 'util';
import test from 'ava';
import releaseNotesGenerator from '../lib/index';

const url = 'https://github.com/owner/repo';
const lastRelease = {gitHead: '123'};
const nextRelease = {gitHead: '456', version: '1.0.0'};

test('Use "conventional-changelog-angular" by default', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {},
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(`<a name="1.0.0"></a>`));
  t.regex(changelog, new RegExp(`\\(https://github.com/owner/repo/compare/123\\.\\.\\.456\\)`));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(`scope1:.*First fix \\(\\[111\\]\\(https://github.com/owner/repo\\/commits\\/111\\)\\)`)
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(`scope2:.*Second feature \\(\\[222\\]\\(https://github.com/owner/repo\\/commits\\/222\\)\\)`)
  );
});

test('Accept a "preset" option', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {preset: 'eslint'},
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(`<a name="1.0.0"></a>`));
  t.regex(changelog, new RegExp(`\\(https://github.com/owner/repo/compare/123\\.\\.\\.456\\)`));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      `First fix .* \\(\\[111\\]\\(https://github.com/owner/repo\\/commits\\/111\\)\\), closes \\[#123\\]\\(https://github.com/owner/repo\\/issues\\/123\\)`
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      `Second feature .* \\(\\[222\\]\\(https://github.com/owner/repo\\/commits\\/222\\)\\), closes \\[#456\\]\\(https://github.com/owner/repo\\/issues\\/456\\)`
    )
  );
});

test.serial('Accept a "config" option', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {config: 'conventional-changelog-eslint'},
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(`<a name="1.0.0"></a>`));
  t.regex(changelog, new RegExp(`\\(https://github.com/owner/repo/compare/123\\.\\.\\.456\\)`));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      `First fix .* \\(\\[111\\]\\(https://github.com/owner/repo\\/commits\\/111\\)\\), closes \\[#123\\]\\(https://github.com/owner/repo\\/issues\\/123\\)`
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      `Second feature .* \\(\\[222\\]\\(https://github.com/owner/repo\\/commits\\/222\\)\\), closes \\[#456\\]\\(https://github.com/owner/repo\\/issues\\/456\\)`
    )
  );
});

test('Accept a "parseOpts" and "writerOpts" objects as option', async t => {
  const commits = [
    {hash: '111', message: '##Fix## First fix (fixes #123)'},
    {hash: '222', message: '##Update## Second feature (fixes #456)'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {
      parserOpts: {headerPattern: /^##(.*?)## (.*)$/, headerCorrespondence: ['tag', 'message']},
      writerOpts: (await promisify(require('conventional-changelog-eslint'))()).writerOpts,
    },
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(`<a name="1.0.0"></a>`));
  t.regex(changelog, new RegExp(`\\(https://github.com/owner/repo/compare/123\\.\\.\\.456\\)`));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      `First fix .* \\(\\[111\\]\\(https://github.com/owner/repo\\/commits\\/111\\)\\), closes \\[#123\\]\\(https://github.com/owner/repo\\/issues\\/123\\)`
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      `Second feature .* \\(\\[222\\]\\(https://github.com/owner/repo\\/commits\\/222\\)\\), closes \\[#456\\]\\(https://github.com/owner/repo\\/issues\\/456\\)`
    )
  );
});

test.serial('Accept a partial "parseOpts" and "writerOpts" objects as option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): 2 First fix (fixes #123)'},
    {hash: '222', message: 'fix(scope2): 1 Second fix (fixes #456)'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {
      preset: 'angular',
      parserOpts: {headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/},
      writerOpts: {commitsSort: ['subject', 'scope']},
    },
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(`<a name="1.0.0"></a>`));
  t.regex(changelog, new RegExp(`\\(https://github.com/owner/repo/compare/123\\.\\.\\.456\\)`));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, /\* \*\*scope2:\*\* 1 Second fix[\S\s]*\* \*\*scope1:\*\* 2 First fix/);
});

test('Ignore malformatted commits and include valid ones', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'Feature => Invalid message'},
  ];
  const changelog = await promisify(releaseNotesGenerator)(
    {},
    {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, /\* \*\*scope1:\*\* First fix/);
  t.notRegex(changelog, /### Features/);
  t.notRegex(changelog, /Feature => Invalid message/);
});

test('Throw error if "preset" doesn`t exist', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const error = await t.throws(
    promisify(releaseNotesGenerator)(
      {preset: 'unknown-preset'},
      {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
    )
  );

  t.is(error.code, 'MODULE_NOT_FOUND');
});

test('Throw error if "config" doesn`t exist', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const error = await t.throws(
    promisify(releaseNotesGenerator)(
      {config: 'unknown-config'},
      {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
    )
  );

  t.is(error.code, 'MODULE_NOT_FOUND');
});

test('ReThrow error from "conventional-changelog"', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const error = await t.throws(
    promisify(releaseNotesGenerator)(
      {
        writerOpts: {
          transform() {
            throw new Error('Test error');
          },
        },
      },
      {pkg: {repository: {url}}, lastRelease, nextRelease, commits}
    )
  );

  t.is(error.message, 'Test error');
});
