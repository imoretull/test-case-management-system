// NDJSON reporter for Playwright. Emits one JSON line per event on stdout
// (prefixed with the marker "TCMS|") so the parent process can tee
// regular output for debugging and still parse events reliably.
//
// CommonJS because Playwright loads reporter modules synchronously and
// commonjs is the safest target across versions.

const PREFIX = 'TCMS|';

function emit(obj) {
  process.stdout.write(PREFIX + JSON.stringify(obj) + '\n');
}

class TcmsReporter {
  onBegin(config, suite) {
    const all = [];
    function walk(s) {
      for (const t of s.tests ?? []) {
        all.push({
          id: t.id,
          title: t.title,
          file: t.location?.file,
          line: t.location?.line,
          path: titlePath(t),
        });
      }
      for (const child of s.suites ?? []) walk(child);
    }
    walk(suite);
    emit({ kind: 'runBegin', tests: all, startTime: Date.now() });
  }

  onTestBegin(test) {
    emit({
      kind: 'testBegin',
      id: test.id,
      title: test.title,
      path: titlePath(test),
    });
  }

  onTestEnd(test, result) {
    emit({
      kind: 'testEnd',
      id: test.id,
      title: test.title,
      path: titlePath(test),
      status: result.status,
      duration: result.duration,
      error: result.error
        ? {
            message: stripAnsi(result.error.message || ''),
            stack: stripAnsi(result.error.stack || ''),
          }
        : undefined,
    });
  }

  onEnd(result) {
    emit({
      kind: 'runEnd',
      status: result.status,
      duration: result.duration,
      endTime: Date.now(),
    });
  }
}

function titlePath(test) {
  // Title path: ["describe outer", "describe inner", "test title"]
  const path = [];
  let curr = test.parent;
  while (curr && curr.parent) {
    if (curr.title) path.unshift(curr.title);
    curr = curr.parent;
  }
  path.push(test.title);
  return path;
}

// Strip ANSI escape codes so error messages render cleanly in the browser.
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

module.exports = TcmsReporter;
