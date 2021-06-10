const {promisify} = require('util');
const path = require('path');
const test = require('ava');
const {outputJson} = require('fs-extra');
const escape = require('escape-string-regexp');
const tempy = require('tempy');
const proxyquire = require('proxyquire');
const {spy} = require('sinon');
const {generateNotes} = require('..');

const cwd = process.cwd();
const host = 'https://github.com';
const owner = 'owner';
const repository = 'repo';
const repositoryUrl = `${host}/${owner}/${repository}`;
const lastRelease = {gitTag: 'v1.0.0'};
const nextRelease = {gitTag: 'v2.0.0', version: '2.0.0'};

test('Use "conventional-changelog-angular" by default', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://github.com/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://github.com/owner/repo/commit/222))'))
  );
});

test('Set conventional-changelog-writer context', async t => {
  const cwd = tempy.directory();
  const writer = spy(require('conventional-changelog-writer'));
  const {generateNotes} = proxyquire('..', {'conventional-changelog-writer': writer});

  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.deepEqual(writer.args[0][0], {
    version: nextRelease.version,
    host,
    owner,
    repository,
    previousTag: lastRelease.gitTag,
    currentTag: nextRelease.gitTag,
    linkCompare: lastRelease.gitTag,
    issue: 'issues',
    commit: 'commit',
    packageData: undefined,
    linkReferences: undefined,
  });
});

test('Set conventional-changelog-writer context with package.json', async t => {
  const cwd = tempy.directory();
  const writer = spy(require('conventional-changelog-writer'));
  const {generateNotes} = proxyquire('..', {'conventional-changelog-writer': writer});

  const packageData = {name: 'package', version: '0.0.0'};
  await outputJson(path.resolve(cwd, 'package.json'), packageData);

  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.deepEqual(writer.args[0][0], {
    version: nextRelease.version,
    host,
    owner,
    repository,
    previousTag: lastRelease.gitTag,
    currentTag: nextRelease.gitTag,
    linkCompare: lastRelease.gitTag,
    issue: 'issues',
    commit: 'commit',
    packageData,
    linkReferences: undefined,
  });
});

test('Accept a "preset" option', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const changelog = await generateNotes(
    {preset: 'eslint'},
    {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* First fix (fixes #123) ([111](https://github.com/owner/repo/commit/111)), closes [#123](https://github.com/owner/repo/issues/123)'
      )
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* Second feature (fixes #456) ([222](https://github.com/owner/repo/commit/222)), closes [#456](https://github.com/owner/repo/issues/456)'
      )
    )
  );
});

test('Accept a "config" option', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  const changelog = await generateNotes(
    {config: 'conventional-changelog-eslint'},
    {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* First fix (fixes #123) ([111](https://github.com/owner/repo/commit/111)), closes [#123](https://github.com/owner/repo/issues/123)'
      )
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* Second feature (fixes #456) ([222](https://github.com/owner/repo/commit/222)), closes [#456](https://github.com/owner/repo/issues/456)'
      )
    )
  );
});

test('Accept a "parseOpts" and "writerOpts" objects as option', async t => {
  const commits = [
    {hash: '111', message: '%%Fix%% First fix (keyword #123)'},
    {hash: '222', message: '%%Update%% Second feature (keyword JIRA-456)'},
  ];
  const changelog = await generateNotes(
    {
      parserOpts: {
        headerPattern: /^%%(?<tag>.*?)%% (?<message>.*)$/,
        headerCorrespondence: ['tag', 'message'],
        referenceActions: ['keyword'],
        issuePrefixes: ['#', 'JIRA-'],
      },
      writerOpts: (await promisify(require('conventional-changelog-eslint'))()).writerOpts,
    },
    {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Fix/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* First fix (keyword #123) ([111](https://github.com/owner/repo/commit/111)), closes [#123](https://github.com/owner/repo/issues/123)'
      )
    )
  );
  t.regex(changelog, /### Update/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* Second feature (keyword JIRA-456) ([222](https://github.com/owner/repo/commit/222)), closes [#456](https://github.com/owner/repo/issues/456)'
      )
    )
  );
});

test('Accept a partial "parseOpts" and "writerOpts" objects as option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): 2 First fix (fixes #123)'},
    {hash: '222', message: 'fix(scope2): 1 Second fix (fixes #456)'},
  ];
  const changelog = await generateNotes(
    {
      preset: 'angular',
      parserOpts: {headerPattern: /^(?<type>\w*)\((?<scope>.*)\): (?<subject>.*)$/},
      writerOpts: {commitsSort: ['subject', 'scope']},
    },
    {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, /\* \*\*scope2:\*\* 1 Second fix[\S\s]*\* \*\*scope1:\*\* 2 First fix/);
});

test('Accept a partial "presetConfig" object as option', async t => {
  const commits = [
    {hash: '111', message: 'fix: First fix'},
    {hash: '222', message: 'test: Change test'},
  ];
  const changelog = await generateNotes(
    {
      preset: 'conventionalcommits',
      presetConfig: {
        types: [
          {type: 'fix', section: 'Bug Fixes', hidden: true},
          {type: 'test', section: 'Test !!', hidden: false},
        ],
      },
    },
    {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
  );

  t.notRegex(changelog, /### Bug Fixes/);
  t.notRegex(changelog, new RegExp(escape('First fix')));
  t.regex(changelog, /### Test !!/);
  t.regex(changelog, new RegExp(escape('* Change test ([222](https://github.com/owner/repo/commit/222))')));
});

test('Use "gitHead" from "lastRelease" and "nextRelease" if "gitTag" is not defined', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {
      cwd,
      options: {repositoryUrl},
      lastRelease: {gitHead: 'abc'},
      nextRelease: {gitHead: 'def', version: '2.0.0'},
      commits,
    }
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/abc...def)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://github.com/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://github.com/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'http://domain.com:90/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(http://domain.com:90/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](http://domain.com:90/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](http://domain.com:90/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with git format', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git@domain.com:owner/repo.git'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://domain.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://domain.com/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://domain.com/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with git format without user', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'domain.com:owner/repo.git'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://domain.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://domain.com/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://domain.com/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with git+http format', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git+http://domain.com:90/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(http://domain.com:90/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](http://domain.com:90/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](http://domain.com:90/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with ".git" extension', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'https://domain.com:90/owner/repo.git'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://domain.com:90/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope1:** First fix ([111](https://domain.com:90/owner/repo/commit/111))'))
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://domain.com:90/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with git+https format', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix\n\nresolve #10'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git+https://domain.com:90/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://domain.com:90/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* **scope1:** First fix ([111](https://domain.com:90/owner/repo/commit/111)), closes [#10](https://domain.com:90/owner/repo/issues/10)'
      )
    )
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://domain.com:90/owner/repo/commit/222))'))
  );
});

test('Accept a custom repository URL with git+ssh format and custom port', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git+ssh://git@domain.com:2222/owner/repo.git'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://domain.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://domain.com/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://domain.com/owner/repo/commit/222))'))
  );
});

test('Accept a Bitbucket repository URL', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix\n\nResolves #10'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git+https://bitbucket.org/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://bitbucket.org/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* **scope1:** First fix ([111](https://bitbucket.org/owner/repo/commits/111)), closes [#10](https://bitbucket.org/owner/repo/issue/10)'
      )
    )
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://bitbucket.org/owner/repo/commits/222))'))
  );
});

test('Accept a Gitlab repository URL', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix\n\nclosed #10'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {cwd, options: {repositoryUrl: 'git+https://gitlab.com/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://gitlab.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* **scope1:** First fix ([111](https://gitlab.com/owner/repo/commit/111)), closes [#10](https://gitlab.com/owner/repo/issues/10)'
      )
    )
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://gitlab.com/owner/repo/commit/222))'))
  );
});

test('Accept a custom AWS CodeCommit repository URL', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {},
    {
      cwd,
      options: {
        repositoryUrl: 'codecommit::eu-central-1://profile@repository-name',
      },
      lastRelease,
      nextRelease,
      commits,
    }
  );

  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix 111')));
  t.regex(changelog, /### Features/);
  t.regex(changelog, new RegExp(escape('* **scope2:** Second feature 222')));
});

test('Accept a "linkCompare" option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix\n\nResolves #10'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {linkCompare: false},
    {cwd, options: {repositoryUrl: 'git+https://bitbucket.org/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('# 2.0.0')));
  t.notRegex(changelog, new RegExp(escape('(https://bitbucket.org/owner/repo/compare/v1.0.0...v2.0.0)')));
});

test('Accept a "linkReferences" option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix\n\nResolves #10'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {linkReferences: false},
    {cwd, options: {repositoryUrl: 'git+https://bitbucket.org/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix 111, closes #10')));
  t.regex(changelog, /### Features/);
  t.regex(changelog, new RegExp(escape('* **scope2:** Second feature 222')));
});

test('Accept a "host" option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {host: 'http://my-host:90'},
    {cwd, options: {repositoryUrl: 'https://github.com/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(http://my-host:90/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](http://my-host:90/owner/repo/commit/111))')));
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](http://my-host:90/owner/repo/commit/222))'))
  );
});

test('Accept a "commit" option', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): Second feature'},
  ];
  const changelog = await generateNotes(
    {commit: 'test-commits'},
    {cwd, options: {repositoryUrl: 'https://github.com/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope1:** First fix ([111](https://github.com/owner/repo/test-commits/111))'))
  );
  t.regex(changelog, /### Features/);
  t.regex(
    changelog,
    new RegExp(escape('* **scope2:** Second feature ([222](https://github.com/owner/repo/test-commits/222))'))
  );
});

test('Accept an "issue" option', async t => {
  const commits = [{hash: '111', message: 'fix(scope1): First fix\n\nresolve #10'}];
  const changelog = await generateNotes(
    {issue: 'test-issues'},
    {cwd, options: {repositoryUrl: 'https://github.com/owner/repo'}, lastRelease, nextRelease, commits}
  );

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(
    changelog,
    new RegExp(
      escape(
        '* **scope1:** First fix ([111](https://github.com/owner/repo/commit/111)), closes [#10](https://github.com/owner/repo/test-issues/10)'
      )
    )
  );
});

test('Ignore malformatted commits and include valid ones', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'Feature => Invalid message'},
  ];
  const changelog = await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, /\* \*\*scope1:\*\* First fix/);
  t.notRegex(changelog, /### Features/);
  t.notRegex(changelog, /Feature => Invalid message/);
});

test('Exclude commits if they have a matching revert commits', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: 'feat(scope2): First feature'},
    {hash: '333', message: 'revert: feat(scope2): First feature\n\nThis reverts commit 222.\n'},
  ];
  const changelog = await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://github.com/owner/repo/commit/111))')));
  t.notRegex(changelog, /### Features/);
  t.notRegex(changelog, /Second feature/);
});

test('Exclude commits with empty message', async t => {
  const commits = [
    {hash: '111', message: 'fix(scope1): First fix'},
    {hash: '222', message: ''},
    {hash: '333', message: '  '},
  ];
  const changelog = await generateNotes({}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits});

  t.regex(changelog, new RegExp(escape('(https://github.com/owner/repo/compare/v1.0.0...v2.0.0)')));
  t.regex(changelog, /### Bug Fixes/);
  t.regex(changelog, new RegExp(escape('* **scope1:** First fix ([111](https://github.com/owner/repo/commit/111))')));
  t.notRegex(changelog, /222/);
  t.notRegex(changelog, /333/);
});

test('Throw error if "preset" doesn`t exist', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  await t.throwsAsync(
    generateNotes({preset: 'unknown-preset'}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}),
    {code: 'MODULE_NOT_FOUND'}
  );
});

test('Throw error if "config" doesn`t exist', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];
  await t.throwsAsync(
    generateNotes({config: 'unknown-config'}, {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}),
    {code: 'MODULE_NOT_FOUND'}
  );
});

test('ReThrow error from "conventional-changelog"', async t => {
  const commits = [
    {hash: '111', message: 'Fix: First fix (fixes #123)'},
    {hash: '222', message: 'Update: Second feature (fixes #456)'},
  ];

  await t.throwsAsync(
    generateNotes(
      {
        writerOpts: {
          transform() {
            throw new Error('Test error');
          },
        },
      },
      {cwd, options: {repositoryUrl}, lastRelease, nextRelease, commits}
    ),
    {message: 'Test error'}
  );
});
